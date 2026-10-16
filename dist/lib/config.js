import { AccountStore } from '../account/account-store.js';
export const loadConfig = (account) => AccountStore.load(account);
export const saveConfig = (config, account) => AccountStore.save(config, account);
export const clearConfig = (account, all = false) => AccountStore.clear(account, all);
