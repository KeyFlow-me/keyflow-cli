import os from 'os';
import readline from 'readline/promises';
import chalk from 'chalk';
import { AGENT_BLOCK } from '../agent-setup/agent-block.js';
import { agentTargets } from '../agent-setup/agent-targets.js';
import { writeAgentTarget } from '../agent-setup/write-agent-target.js';
/** `keyflow agent setup`: add the KeyFlow pointer block to the chosen agents' instruction files. */
export async function agentSetupCommand(options = {}) {
    if (options.print) {
        console.log(AGENT_BLOCK.text);
        return;
    }
    const targets = agentTargets({ home: os.homedir(), cwd: process.cwd(), codexHome: process.env.CODEX_HOME });
    const defaults = targets.filter((target) => target.detected);
    console.log(chalk.bold('\nKeyFlow agent setup'));
    console.log(chalk.gray('Adds a short pointer ("run `keyflow guide` first") to each agent\'s instruction file.'));
    console.log(chalk.gray(`Only the block between ${AGENT_BLOCK.start} and ${AGENT_BLOCK.end} is written.\n`));
    targets.forEach((target, index) => {
        const mark = target.detected ? chalk.green('detected') : chalk.gray(target.scope === 'project' ? 'optional' : 'not found');
        console.log(`  ${index + 1}. ${target.name}  [${mark}]`);
        console.log(chalk.gray(`     ${target.file}`));
    });
    console.log(chalk.gray('\nOther agents: run "keyflow agent setup --print" and paste the text into their instruction file.\n'));
    let selected = defaults;
    if (!options.yes) {
        if (!process.stdin.isTTY) {
            console.log(chalk.yellow('Not an interactive terminal. Re-run with --yes to write the detected targets.'));
            return;
        }
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const defaultLabel = defaults.length > 0 ? defaults.map((target) => targets.indexOf(target) + 1).join(',') : 'none';
        const answer = await rl.question(`Write to which targets? Enter = detected (${defaultLabel}), numbers like 1,3, "all", or "n" to cancel: `);
        rl.close();
        selected = pickTargets(answer, targets, defaults);
    }
    if (!selected || selected.length === 0) {
        console.log(chalk.gray('Nothing was written.'));
        return;
    }
    let failed = false;
    for (const target of selected) {
        try {
            console.log(`${chalk.green('✓')} ${target.name}: ${writeAgentTarget(target)} ${chalk.gray(target.file)}`);
        }
        catch (error) {
            failed = true;
            console.error(`${chalk.red('✗')} ${target.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    if (failed)
        process.exit(1);
    console.log(chalk.gray('\nAsk your agent to "post this to KeyFlow" and it will start with `keyflow guide`.\n'));
}
/** Enter/y = detected targets, "all", comma-separated numbers, or null to cancel. */
function pickTargets(answer, targets, defaults) {
    const trimmed = answer.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'y' || trimmed === 'yes')
        return defaults;
    if (trimmed === 'n' || trimmed === 'no')
        return null;
    if (trimmed === 'all')
        return targets;
    const picked = [];
    for (const part of trimmed.split(/[\s,]+/)) {
        const index = Number(part) - 1;
        if (!Number.isInteger(index) || !targets[index])
            return null;
        if (!picked.includes(targets[index]))
            picked.push(targets[index]);
    }
    return picked;
}
