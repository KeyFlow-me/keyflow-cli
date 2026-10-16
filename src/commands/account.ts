import { AccountStore } from '../account/account-store.js';

function run(action: () => void) {
  try { action(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : 'Account operation failed.');
    process.exitCode = 1;
  }
}

export const AccountCommands = {
  list(options: { json?: boolean } = {}) {
    run(() => {
      const accounts = AccountStore.list();
      if (options.json) { console.log(JSON.stringify({ accounts }, null, 2)); return; }
      if (!accounts.length) { console.log('No saved accounts. Run "keyflow login".'); return; }
      for (const account of accounts) {
        console.log(`${account.active ? '*' : ' '} ${account.name} — ${account.username ? `@${account.username}` : account.email} (${account.uid})`);
      }
      console.log('Use "keyflow push <file> --account <name>" for one upload.');
    });
  },
  use(name: string) {
    run(() => {
      AccountStore.use(name);
      console.log(`Default account: ${name}`);
      if (process.env.KEYFLOW_ACCOUNT || process.env.KEYFLOW_DEVICE_CREDENTIAL || process.env.KEYFLOW_REFRESH_TOKEN) {
        console.log('Account or credential environment variables still override the default in this shell.');
      }
    });
  },
  save(name: string) {
    run(() => {
      AccountStore.saveCurrent(name);
      console.log(`Saved the current local connection as "${name}".`);
    });
  },
};
