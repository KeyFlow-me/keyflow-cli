import path from 'path';
import chalk from 'chalk';
/** Print check findings as `file:line  severity  code  message` with the hint below. */
export function printCheckItems(file, items) {
    const relativePath = path.relative(process.cwd(), file);
    const shown = relativePath && !relativePath.startsWith('..') ? relativePath : file;
    for (const item of items) {
        const label = item.severity === 'error' ? chalk.red('error') : chalk.yellow('warning');
        console.log(`${shown}:${item.line}  ${label}  ${chalk.gray(item.code)}  ${item.message}`);
        if (item.hint)
            console.log(chalk.gray(`    ${item.hint}`));
    }
}
