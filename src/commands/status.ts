import chalk from 'chalk';
import { loadConfig } from '../lib/config.js';

export const statusCommand = () => {
  const config = loadConfig();

  console.log(chalk.bold.hex('#6366f1')('\n📊 KeyFlow CLI Status\n'));

  if (!config || !config.refreshToken) {
    console.log(chalk.yellow('Status: Not logged in'));
    console.log(chalk.gray('Run "keyflow login" to authenticate.\n'));
    return;
  }

  console.log(chalk.green('Status: Logged in ✅'));
  console.log(chalk.gray(`User: ${config.email}`));
  console.log(chalk.gray(`UID: ${config.uid}`));
  console.log(chalk.gray(`Last Login: ${config.lastLogin ? new Date(config.lastLogin).toLocaleString() : 'Unknown'}\n`));
};
