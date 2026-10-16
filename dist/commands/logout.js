import chalk from 'chalk';
import { clearConfig } from '../lib/config.js';
export const logoutCommand = (options = {}) => {
    if (options.all && options.account) {
        console.error('Choose --account or --all, not both.');
        process.exitCode = 1;
        return;
    }
    try {
        clearConfig(options.account, options.all);
    }
    catch (error) {
        console.error(chalk.red('\n❌ Could not remove every local KeyFlow session file.'));
        console.error(chalk.gray(error.message || String(error)));
        console.log(chalk.gray('\nFix the file permissions or remove the legacy session file manually, then run `keyflow status` again.\n'));
        process.exit(1);
    }
    console.log(chalk.green('\n✅ Logged out of KeyFlow CLI.'));
    console.log(chalk.gray(options.all ? 'Removed all locally saved accounts.' : 'Removed only the selected local connection; other saved accounts remain.'));
    if (process.env.KEYFLOW_DEVICE_CREDENTIAL || process.env.KEYFLOW_REFRESH_TOKEN) {
        console.log(chalk.yellow('\nNote: KEYFLOW_DEVICE_CREDENTIAL or KEYFLOW_REFRESH_TOKEN is still set in this shell.'));
        console.log(chalk.gray('Unset those environment variables if you want commands in this shell to be fully logged out.\n'));
    }
    else {
        console.log('');
    }
    if (process.env.KEYFLOW_ACCOUNT)
        console.log(chalk.gray('KEYFLOW_ACCOUNT is still selected in this shell.'));
};
