import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { CLIConfig } from '../lib/config.js';
import { PrivateFile } from './private-file.js';

// Owner: short-lived Firebase ID tokens minted by `keyflow push`; allowed imports: Node IO, config type.
// The key hashes the server origin and the long-lived credential, so another login,
// account or server never sees this token. Check: id-token-cache.test.mjs.
type Entry = { idToken: string; uid: string; expiresAt: number };
type CacheFile = { schemaVersion: 1; tokens: Record<string, Entry> };

/** Reuse a token only while it stays valid for at least this long. */
const MIN_REMAINING_MS = 5 * 60 * 1000;

const cachePath = () => path.join(PrivateFile.directory(), 'id-tokens.json');

// Credentials passed through the environment (CI, scripts) never leave tokens on disk.
function keyOf(baseUrl: string, config: CLIConfig) {
  const credential = config.deviceCredential ?? config.refreshToken;
  if (!credential) return undefined;
  if (credential === process.env.KEYFLOW_DEVICE_CREDENTIAL || credential === process.env.KEYFLOW_REFRESH_TOKEN) return undefined;
  return createHash('sha256').update(`${new URL(baseUrl).origin}\n${credential}`).digest('hex');
}

function validEntry(value: unknown): value is Entry {
  const item = value as Partial<Entry> | null;
  return Boolean(item) && typeof item!.idToken === 'string' && typeof item!.uid === 'string' && typeof item!.expiresAt === 'number';
}

// A missing or broken cache only costs one extra token exchange.
function read(): CacheFile {
  try {
    const value = JSON.parse(fs.readFileSync(cachePath(), 'utf8')) as CacheFile;
    if (value?.schemaVersion === 1 && value.tokens && typeof value.tokens === 'object') return value;
  } catch { /* fall through */ }
  return { schemaVersion: 1, tokens: Object.create(null) };
}

function write(data: CacheFile) {
  try { PrivateFile.writeJson(cachePath(), data); } catch { /* caching is best effort */ }
}

export const IdTokenCache = {
  get(baseUrl: string, config: CLIConfig, now = Date.now()): Entry | undefined {
    const key = keyOf(baseUrl, config);
    const entry = key ? read().tokens[key] : undefined;
    return validEntry(entry) && entry.expiresAt - now > MIN_REMAINING_MS ? entry : undefined;
  },
  put(baseUrl: string, config: CLIConfig, entry: Entry, now = Date.now()) {
    const key = keyOf(baseUrl, config);
    if (!key) return;
    const data = read();
    for (const [stale, value] of Object.entries(data.tokens)) {
      if (!validEntry(value) || value.expiresAt <= now) delete data.tokens[stale];
    }
    data.tokens[key] = entry;
    write(data);
  },
  forget(baseUrl: string, config: CLIConfig) {
    const key = keyOf(baseUrl, config);
    const data = read();
    if (!key || !(key in data.tokens)) return;
    delete data.tokens[key];
    write(data);
  },
  clear() {
    fs.rmSync(cachePath(), { force: true });
  },
};
