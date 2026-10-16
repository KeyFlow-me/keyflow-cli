import chalk from 'chalk';
import { loadConfig } from '../lib/config.js';
export const statusCommand = (options = {}) => {
    let config;
    try {
        config = loadConfig(options.account);
    }
    catch (error) {
        console.error(error instanceof Error ? error.message : 'Could not read the selected account.');
        process.exitCode = 1;
        return;
    }
    console.log(chalk.bold.hex('#6366f1')('\n📊 KeyFlow CLI Status\n'));
    if (!config || (!config.deviceCredential && !config.refreshToken)) {
        console.log(chalk.yellow('Status: Not logged in'));
        console.log(chalk.gray('Run "keyflow login" to authenticate.\n'));
        return;
    }
    console.log(chalk.green('Status: Logged in ✅'));
    if (config.accountName)
        console.log(chalk.gray(`Account: ${config.accountName}`));
    if (config.username)
        console.log(chalk.gray(`Author: @${config.username}`));
    console.log(chalk.gray(`Session: ${config.deviceCredential ? 'Device credential' : 'Legacy refresh token'}`));
    console.log(chalk.gray(`User: ${config.email}`));
    console.log(chalk.gray(`UID: ${config.uid}`));
    console.log(chalk.gray(`Last Login: ${config.lastLogin ? new Date(config.lastLogin).toLocaleString() : 'Unknown'}\n`));
};
