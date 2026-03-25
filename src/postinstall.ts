#!/usr/bin/env node
import chalk from 'chalk';
import { printCatLogo } from './lib/logo.js';

// Print the beautiful KeyFlow Cat Logo
printCatLogo();

console.log(chalk.green('\n🎉 Successfully installed KeyFlow Blog Editorial Studio CLI!\n'));
console.log(chalk.gray('To authenticate and get started, run the following command:'));
console.log('  ' + chalk.bold.hex('#6366f1')('keyflow login\n'));
