import fs from 'fs';
import path from 'path';
import type { CLIConfig } from '../lib/config.js';
import { IdTokenCache } from './id-token-cache.js';
import { PrivateFile } from './private-file.js';

// Owner: CLI local persistence; allowed imports: Node IO, config type; forbidden:
// auth/network/commands. Callers: config and account commands. Check: account-store.test.mjs.
const directory = PrivateFile.directory();
const configPath = path.join(directory, 'config.json');
const accountsPath = path.join(directory, 'accounts.json');
// Sessions are read only from ~/.keyflow. A `.keyflow_session.json` in the working directory is
// never trusted: any repository could ship one and redirect posts to another account.
type Registry = { schemaVersion: 1; accounts: Record<string, CLIConfig> };

function validSession(value: unknown): value is CLIConfig {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return ['uid', 'email', 'lastLogin'].every(key => typeof item[key] === 'string') &&
    ['deviceCredential', 'tokenType', 'refreshToken', 'username', 'accountName', 'baseUrl']
      .every(key => item[key] === undefined || typeof item[key] === 'string');
}
function readJson(file: string): unknown {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { throw new Error(`Invalid KeyFlow session storage: ${path.basename(file)}. Repair or remove it explicitly.`); }
}
function flat(): CLIConfig | null {
  if (!fs.existsSync(configPath)) return null;
  const value = readJson(configPath);
  if (!validSession(value)) throw new Error(`Invalid KeyFlow session storage: ${path.basename(configPath)}.`);
  return value;
}
function registry(): Registry {
  if (!fs.existsSync(accountsPath)) return { schemaVersion: 1, accounts: Object.create(null) };
  const value = readJson(accountsPath) as Registry | null;
  if (!value || value.schemaVersion !== 1 || !value.accounts || typeof value.accounts !== 'object' ||
      Array.isArray(value.accounts) || !Object.values(value.accounts).every(validSession)) {
    throw new Error('Invalid KeyFlow account storage: accounts.json. Repair or remove it explicitly.');
  }
  return value;
}
function nameOf(name: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(name)) throw new Error('Invalid account name. Use letters, numbers, dots, underscores or hyphens.');
  return name;
}
function selected(name?: string): string | undefined {
  const selection = name ?? process.env.KEYFLOW_ACCOUNT;
  return selection === undefined ? undefined : nameOf(selection);
}
function entry(data: Registry, name: string): CLIConfig | undefined {
  return Object.hasOwn(data.accounts, name) ? data.accounts[name] : undefined;
}
function put(data: Registry, name: string, config: CLIConfig) {
  nameOf(name);
  const previous = entry(data, name);
  if (previous && previous.uid !== config.uid) throw new Error(`Account "${name}" belongs to another user. Choose another name.`);
  Object.defineProperty(data.accounts, name, { value: { ...config, accountName: name }, enumerable: true, writable: true, configurable: true });
}
function snapshotName(data: Registry, config: CLIConfig): string {
  let name = config.accountName || config.username || 'default';
  // Desktop can replace the UID while retaining an old alias.
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(name) || (entry(data, name) && entry(data, name)!.uid !== config.uid)) {
    name = config.username && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/.test(config.username) ? config.username : 'default';
    if (entry(data, name) && entry(data, name)!.uid !== config.uid) name = `default-${Buffer.from(config.uid).toString('hex').slice(0, 96)}`;
  }
  return name;
}
function snapshot(data: Registry, config: CLIConfig | null) {
  if (config) put(data, snapshotName(data, config), config);
}
const atomic = PrivateFile.writeJson;
function remove(file: string) { if (fs.existsSync(file)) fs.unlinkSync(file); }

export const AccountStore = {
  load(account?: string): CLIConfig | null {
    const name = selected(account);
    if (name !== undefined) {
      const data = registry();
      let config = entry(data, name);
      const current = flat();
      if (current && snapshotName(data, current) === name) config = current;
      if (!config) throw new Error(`Unknown account "${name}". Run "keyflow account list".`);
      return { ...config, accountName: name };
    }
    if (process.env.KEYFLOW_DEVICE_CREDENTIAL || process.env.KEYFLOW_REFRESH_TOKEN) {
      return {
        ...(process.env.KEYFLOW_DEVICE_CREDENTIAL
          ? { deviceCredential: process.env.KEYFLOW_DEVICE_CREDENTIAL, tokenType: 'keyflow_device_v1' }
          : { refreshToken: process.env.KEYFLOW_REFRESH_TOKEN }),
        email: process.env.KEYFLOW_USER_EMAIL || 'env-user',
        uid: process.env.KEYFLOW_USER_UID || 'env-uid', lastLogin: new Date().toISOString(),
      };
    }
    return flat();
  },
  save(config: CLIConfig, account?: string) {
    if (!validSession(config)) throw new Error('Invalid KeyFlow session.');
    const data = registry();
    snapshot(data, flat());
    const name = selected(account) ?? snapshotName(data, config);
    put(data, name, config);
    atomic(accountsPath, data);
    atomic(configPath, { ...config, accountName: name });
  },
  list() {
    const data = registry();
    const current = flat();
    const active = current ? snapshotName(data, current) : undefined;
    if (current && active) put(data, active, current);
    return Object.entries(data.accounts).map(([name, config]) => ({
      name, uid: config.uid, email: config.email,
      ...(config.username ? { username: config.username } : {}), active: name === active,
    }));
  },
  use(name: string) {
    nameOf(name);
    const data = registry();
    snapshot(data, flat());
    const target = entry(data, name);
    if (!target) throw new Error(`Unknown account "${name}". Run "keyflow account list".`);
    atomic(accountsPath, data);
    atomic(configPath, { ...entry(data, name)!, accountName: name });
  },
  saveCurrent(name: string) {
    nameOf(name);
    const current = flat();
    if (!current) throw new Error('No current session. Run "keyflow login" first.');
    AccountStore.save(current, name);
  },
  clear(account?: string, all = false) {
    // A cached ID token must not outlive the connection that minted it.
    IdTokenCache.clear();
    if (all) { remove(accountsPath); remove(configPath); return; }
    const data = registry();
    const current = flat();
    const selection = selected(account);
    const active = current ? snapshotName(data, current) : undefined;
    if (selection !== undefined && !entry(data, selection) && selection !== active) throw new Error(`Unknown account "${selection}".`);
    snapshot(data, current);
    const name = selection ?? active;
    if (name) delete data.accounts[name];
    atomic(accountsPath, data);
    if (!selection || selection === active) remove(configPath);
  },
};
