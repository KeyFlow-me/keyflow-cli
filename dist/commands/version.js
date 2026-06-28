import chalk from 'chalk';
import { getVersion } from '../lib/logo.js';
import { checkForUpdate } from '../version/check-for-update.js';
import { PACKAGE_NAME } from '../version/package-info.js';
export const versionCommand = async (options = {}) => {
    const currentVersion = getVersion();
    console.log(chalk.bold(`KeyFlow CLI v${currentVersion}`));
    if (!options.check)
        return;
    try {
        const result = await checkForUpdate(currentVersion);
        if (result.updateAvailable) {
            console.log(chalk.yellow(`Update available: v${result.latestVersion}`));
            console.log(chalk.gray(`Run: npm install -g ${PACKAGE_NAME}@latest`));
            return;
        }
        console.log(chalk.green('You are using the latest published version.'));
    }
    catch (error) {
        console.error(chalk.red('Failed to check for updates:'), error.message || error);
        process.exit(1);
    }
};
