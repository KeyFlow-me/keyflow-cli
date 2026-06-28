import fs from 'fs';
import os from 'os';
import path from 'path';

const CONFIG_DIR = path.join(os.homedir(), '.keyflow');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const LEGACY_CONFIG_PATH = path.join(process.cwd(), '.keyflow_session.json');

export interface CLIConfig {
  deviceCredential?: string;
  tokenType?: string;
  refreshToken?: string;
  email: string;
  uid: string;
  lastLogin: string;
}

export const loadConfig = (): CLIConfig | null => {
  // Priority 1: Environment Variable (Perfect for automated CI/AI scripts)
  if (process.env.KEYFLOW_DEVICE_CREDENTIAL) {
    return {
      deviceCredential: process.env.KEYFLOW_DEVICE_CREDENTIAL,
      tokenType: 'keyflow_device_v1',
      email: process.env.KEYFLOW_USER_EMAIL || 'env-user',
      uid: process.env.KEYFLOW_USER_UID || 'env-uid',
      lastLogin: new Date().toISOString(),
    };
  }
  if (process.env.KEYFLOW_REFRESH_TOKEN) {
    return {
      refreshToken: process.env.KEYFLOW_REFRESH_TOKEN,
      email: process.env.KEYFLOW_USER_EMAIL || 'env-user',
      uid: process.env.KEYFLOW_USER_UID || 'env-uid',
      lastLogin: new Date().toISOString(),
    };
  }

  // Priority 2: User-scoped session file shared with KeyFlow Desktop.
  let configPath: string | null = null;
  if (fs.existsSync(CONFIG_PATH)) {
    configPath = CONFIG_PATH;
  } else if (fs.existsSync(LEGACY_CONFIG_PATH)) {
    console.warn(`Warning: using legacy KeyFlow session file at ${LEGACY_CONFIG_PATH}. Run "keyflow login" to migrate to ~/.keyflow/config.json.`);
    configPath = LEGACY_CONFIG_PATH;
  }

  if (!configPath) {
    return null;
  }

  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to parse config:', error);
    return null;
  }
};

export const saveConfig = (config: CLIConfig) => {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const tempPath = path.join(CONFIG_DIR, `.config.${process.pid}.${Date.now()}.tmp`);
  try {
    fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), { mode: 0o600 });
    fs.chmodSync(tempPath, 0o600);
    fs.renameSync(tempPath, CONFIG_PATH);
    fs.chmodSync(CONFIG_PATH, 0o600);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
};

export const clearConfig = () => {
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
  if (fs.existsSync(LEGACY_CONFIG_PATH)) {
    fs.unlinkSync(LEGACY_CONFIG_PATH);
  }
};
