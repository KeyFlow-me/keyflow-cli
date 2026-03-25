import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { loadConfig } from '../lib/config.js';
export const pushCommand = async (filePath) => {
    const config = loadConfig();
    if (!config || !config.refreshToken) {
        console.error(chalk.red('\n❌ Error: Not logged in.'));
        console.log(chalk.gray('Please run "keyflow login" first.\n'));
        process.exit(1);
    }
    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(chalk.red(`\n❌ Error: File not found at ${absolutePath}`));
        process.exit(1);
    }
    const content = fs.readFileSync(absolutePath, 'utf8');
    // Extract real title from Markdown H1 if exists
    const h1Match = content.match(/^#\s+(.+)$/m);
    const realTitle = h1Match ? h1Match[1].trim() : path.basename(filePath, '.md');
    const fileName = path.basename(filePath, '.md');
    console.log(chalk.blue(`\n📤 Preparing to push draft: ${chalk.bold(realTitle)}...`));
    if (h1Match)
        console.log(chalk.gray(`(Extracted title from Markdown H1)`));
    try {
        console.log(chalk.gray('Refreshing secure session token...'));
        // In many CLI cases, we need to wait for Firebase to initialize 
        // and potentially use the refreshToken to get a fresh ID Token.
        // Simplifying for this flow: If we don't have a currentUser, we just proceed with the error for now
        // as the login command just ran or the config is there.
        // To properly refresh in CLI securely without hardcoding our API Keys:
        // We fetch the latest public API Key directly from our KeyFlow server at runtime
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.keyflow.me';
        console.log(chalk.gray('Securely fetching environment configuration...'));
        const configRes = await fetch(`${baseUrl}/api/cli/config`);
        if (!configRes.ok) {
            throw new Error('Failed to retrieve KeyFlow platform configuration');
        }
        const { apiKey } = await configRes.json();
        const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=refresh_token&refresh_token=${config.refreshToken}`
        });
        const refreshData = await refreshRes.json();
        if (!refreshData.id_token) {
            console.error(chalk.red('\n[DEBUG] Token refresh failed. Google response:'), refreshData);
            throw new Error('Session expired. Please run "keyflow login" again.');
        }
        const idToken = refreshData.id_token;
        console.log(chalk.gray('Uploading content to KeyFlow...'));
        const response = await fetch(`${baseUrl}/api/cli/draft`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                title: realTitle,
                content: content
            })
        });
        const result = await response.json();
        if (result.success) {
            console.log(chalk.green.bold('\n✅ Draft uploaded successfully!'));
            console.log(chalk.gray(`Draft ID: ${result.postId}`));
            console.log(chalk.gray(`View at: ${result.url}\n`));
        }
        else {
            throw new Error(result.error || 'Server rejected the upload');
        }
        process.exit(0);
    }
    catch (error) {
        console.error(chalk.red('\n❌ Push failed:'), error.message);
        process.exit(1);
    }
};
