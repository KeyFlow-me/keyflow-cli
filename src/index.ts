#!/usr/bin/env node
import * as dotenv from 'dotenv';

// Load environment variables from the CLI project root first
dotenv.config();

import { Command } from 'commander';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { pushCommand } from './commands/push.js';
import { statusCommand } from './commands/status.js';
import { updateCommand } from './commands/update.js';
import { versionCommand } from './commands/version.js';
import { checkCommand } from './commands/check.js';
import { guideCommand } from './commands/guide.js';
import { agentSetupCommand } from './commands/agent.js';
import { printCatLogo, getVersion } from './lib/logo.js';

const program = new Command();

// Custom version override to show the cat logo!
if (process.argv.includes('-v') || process.argv.includes('--version')) {
    printCatLogo();
    process.exit(0);
}

const AGENT_HINT = 'AI agents: run `keyflow guide` first and follow it before writing or pushing a KeyFlow post.';

// Bare `keyflow`: the agent hint stays the very first line, then the cat and the help screen.
if (process.argv.length <= 2) {
    console.log(AGENT_HINT);
    printCatLogo();
} else {
    program.addHelpText('beforeAll', `${AGENT_HINT}\n`);
}

program
  .name('keyflow')
  .description('KeyFlow Blog Editorial Studio CLI')
  .version(getVersion(), '-v, --version', 'Output the current version');

program
    .command('login')
    .description('Login to KeyFlow Blog with secure browser approval')
    .action(loginCommand);

program
    .command('logout')
    .description('Remove the local KeyFlow CLI session')
    .action(logoutCommand);

program
    .command('status')
    .description('Check current login status')
    .action(statusCommand);

program
    .command('version')
    .description('Show the current CLI version')
    .option('--check', 'Check npm for the latest published version')
    .action(versionCommand);

program
    .command('update')
    .description('Check for a newer KeyFlow CLI release')
    .option('--yes', 'Run npm install -g @keyflow-blog/cli@latest when an update is available')
    .action(updateCommand);

program
    .command('push')
    .description('Push a markdown file to KeyFlow (private draft unless the file says publish: true)')
    .argument('<file>', 'Path to the markdown file')
    .option('--dry-run', 'Check the file locally without uploading')
    .option('--publish', 'Publish this time (same as publish: true; the file is not changed)')
    .option('--json', 'Print a machine-readable result')
    .action(pushCommand);

program
    .command('check')
    .description('Check a markdown file offline before pushing')
    .argument('<file>', 'Path to the markdown file')
    .option('--json', 'Print machine-readable results')
    .action(checkCommand);

program
    .command('guide')
    .description('Print the KeyFlow guide for AI agents (upload steps and syntax)')
    .action(guideCommand);

const agent = program
    .command('agent')
    .description('Connect AI agents to KeyFlow');

agent
    .command('setup')
    .description('Add a short "run keyflow guide first" pointer to AI agent instruction files')
    .option('--print', 'Only print the pointer text')
    .option('--yes', 'Write to the detected agents without asking')
    .action(agentSetupCommand);

program.parse(process.argv);
