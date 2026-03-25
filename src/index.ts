#!/usr/bin/env node
import * as dotenv from 'dotenv';

// Load environment variables from the CLI project root first
dotenv.config();

import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { pushCommand } from './commands/push.js';
import { statusCommand } from './commands/status.js';
import { printCatLogo, getVersion } from './lib/logo.js';

const program = new Command();

// Custom version override to show the cat logo!
if (process.argv.includes('-v') || process.argv.includes('--version')) {
    printCatLogo();
    process.exit(0);
}

// Show ASCII cat if no arguments are provided (help screen)
if (process.argv.length <= 2) {
    printCatLogo();
}

program
  .name('keyflow')
  .description('KeyFlow Blog Editorial Studio CLI')
  .version(getVersion(), '-v, --version', 'Output the current version');

program
    .command('login')
    .description('Login to KeyFlow Blog via Firebase')
    .action(loginCommand);

program
    .command('status')
    .description('Check current login status')
    .action(statusCommand);

program
    .command('push')
    .description('Push a local markdown file as a KeyFlow draft')
    .argument('<file>', 'Path to the markdown file')
    .action(pushCommand);

program.parse(process.argv);
