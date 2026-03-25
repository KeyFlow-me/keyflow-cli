import http from 'http';
import { exec } from 'child_process';
import chalk from 'chalk';
import { saveConfig } from '../lib/config.js';
import { printCatLogo } from '../lib/logo.js';
export const loginCommand = async () => {
    const PORT = 4242;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.keyflow.me';
    const authUrl = `${baseUrl}/ko/manage/cli/auth?port=${PORT}`;
    printCatLogo();
    console.log(chalk.gray('Opening your browser for secure social authentication...'));
    const server = http.createServer((req, res) => {
        // Handle CORS preflight
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }
        if (req.method === 'POST' && req.url?.startsWith('/callback')) {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    const { refreshToken, email, uid } = data;
                    if (!refreshToken)
                        throw new Error('No refresh token received');
                    saveConfig({
                        refreshToken,
                        email,
                        uid,
                        lastLogin: new Date().toISOString(),
                    });
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                    console.log(chalk.green.bold('\n✅ Successfully logged in!'));
                    console.log(chalk.gray(`Logged in as: ${email}`));
                    console.log(chalk.gray(`Session saved to ~/.keyflow/config.json\n`));
                    // Give a small delay to let the response finish before closing
                    setTimeout(() => {
                        server.close();
                        process.exit(0);
                    }, 500);
                }
                catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: err.message }));
                    console.error(chalk.red('\n❌ Auth failed:'), err.message);
                }
            });
        }
        else {
            res.writeHead(404);
            res.end();
        }
    });
    // 명시적으로 127.0.0.1(IPv4)에 바인딩하여 브라우저 렌더링 엔진과의 IPv6/v4 mismatch 방해 방지
    server.listen(PORT, '127.0.0.1', () => {
        console.log(chalk.cyan(`\nWaiting for authentication on port ${PORT}...`));
        // Open the browser
        const openCommand = process.platform === 'win32' ? 'start' : 'open';
        exec(`${openCommand} "${authUrl}"`);
        console.log(chalk.gray(`If the browser doesn't open automatically, visit:`));
        console.log(chalk.underline.blue(authUrl));
        console.log(chalk.gray('\nPress Ctrl+C to cancel anytime.\n'));
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(chalk.red(`\n❌ Error: Port ${PORT} is already in use.`));
            console.log(chalk.gray('Please close other applications using this port and try again.\n'));
        }
        else {
            console.error(chalk.red('\n❌ Server error:'), err.message);
        }
        process.exit(1);
    });
};
