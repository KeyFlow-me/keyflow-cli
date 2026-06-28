import { spawnSync } from 'child_process';
import chalk from 'chalk';
import { getVersion } from '../lib/logo.js';
import { checkForUpdate } from '../version/check-for-update.js';
import { PACKAGE_NAME } from '../version/package-info.js';

type UpdateOptions = {
  yes?: boolean;
};

export const updateCommand = async (options: UpdateOptions = {}) => {
  const currentVersion = getVersion();

  try {
    const result = await checkForUpdate(currentVersion);
    console.log(chalk.bold(`KeyFlow CLI v${result.currentVersion}`));
    console.log(chalk.gray(`Latest published version: v${result.latestVersion}`));

    if (!result.updateAvailable) {
      console.log(chalk.green('Already up to date.\n'));
      return;
    }

    const installArgs = ['install', '-g', `${PACKAGE_NAME}@latest`];
    console.log(chalk.yellow(`Update available: v${result.latestVersion}`));

    if (!options.yes) {
      console.log(chalk.gray(`Run: npm ${installArgs.join(' ')}`));
      console.log(chalk.gray('Or run: keyflow update --yes\n'));
      return;
    }

    console.log(chalk.gray(`Running: npm ${installArgs.join(' ')}`));
    const updateResult = spawnSync('npm', installArgs, { stdio: 'inherit' });
    if (updateResult.status !== 0) {
      throw new Error('npm install failed.');
    }
  } catch (error: any) {
    console.error(chalk.red('Update check failed:'), error.message || error);
    process.exit(1);
  }
};
