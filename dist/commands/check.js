import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { analyzeMarkdown } from '../markdown-check/analyze-markdown.js';
import { printCheckItems } from './print-check-items.js';
/** `keyflow check <file>`: offline checks, human-readable or `--json`. Exits 1 on errors. */
export function checkCommand(filePath, options = {}) {
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
        const item = {
            code: 'file-not-found',
            line: 0,
            message: `File not found at ${absolutePath}`,
            hint: 'Check the file path.',
            severity: 'error',
        };
        if (options.json) {
            console.log(JSON.stringify({ ok: false, file: absolutePath, errors: 1, warnings: 0, items: [item] }, null, 2));
        }
        else {
            console.error(chalk.red(`\n❌ ${item.message}\n`));
        }
        process.exit(1);
    }
    const analysis = analyzeMarkdown(absolutePath, fs.readFileSync(absolutePath, 'utf8'));
    const ok = analysis.errors === 0;
    if (options.json) {
        const { post } = analysis;
        const result = {
            ok,
            file: absolutePath,
            title: post?.title,
            status: post?.status,
            visibility: post?.visibility,
            images: analysis.images.length,
            errors: analysis.errors,
            warnings: analysis.warnings,
            items: analysis.items,
        };
        console.log(JSON.stringify(result, null, 2));
        process.exit(ok ? 0 : 1);
    }
    if (analysis.items.length > 0)
        printCheckItems(absolutePath, analysis.items);
    if (!ok) {
        console.log(chalk.red(`\n❌ ${analysis.errors} error(s), ${analysis.warnings} warning(s).\n`));
        process.exit(1);
    }
    console.log(chalk.green(`\n✅ ${path.basename(absolutePath)} looks good.`));
    if (analysis.post) {
        console.log(chalk.gray(`Title: ${analysis.post.title}`));
        console.log(chalk.gray(`Mode: ${analysis.post.status} (${analysis.post.visibility})`));
    }
    console.log(chalk.gray(`Local images: ${analysis.images.length}\n`));
}
