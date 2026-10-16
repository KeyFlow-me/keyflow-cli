import { AccountStore } from '../account/account-store.js';

export interface CLIConfig {
  deviceCredential?: string;
  tokenType?: string;
  refreshToken?: string;
  email: string;
  uid: string;
  lastLogin: string;
  username?: string;
  accountName?: string;
  baseUrl?: string;
}
export const loadConfig = (account?: string): CLIConfig | null => AccountStore.load(account);
export const saveConfig = (config: CLIConfig, account?: string) => AccountStore.save(config, account);
export const clearConfig = (account?: string, all = false) => AccountStore.clear(account, all);
