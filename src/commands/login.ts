import chalk from 'chalk';
import { createDeviceAuthRequest } from '../auth/device-auth.js';
import { createCallbackServer } from '../auth/local-callback-server.js';
import { openBrowser } from '../auth/open-browser.js';
import { printCatLogo } from '../lib/logo.js';

const AUTH_CALLBACK_PORT = 4242;

export const loginCommand = async () => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.keyflow.me';
  const allowedOrigin = new URL(baseUrl).origin;
  const authRequest = createDeviceAuthRequest();
  const authUrl = new URL('/ko/manage/cli/auth', baseUrl);
  authUrl.searchParams.set('port', `${AUTH_CALLBACK_PORT}`);
  authUrl.searchParams.set('state', authRequest.state);
  authUrl.searchParams.set('code_challenge', authRequest.codeChallenge);

  printCatLogo();
  console.log(chalk.gray('Opening your browser for one-time KeyFlow authentication...'));

  const server = createCallbackServer({
    port: AUTH_CALLBACK_PORT,
    baseUrl,
    allowedOrigin,
    authRequest,
  });

  // Bind explicitly to IPv4 loopback to avoid browser IPv6/IPv4 localhost mismatch.
  server.listen(AUTH_CALLBACK_PORT, '127.0.0.1', () => {
    console.log(chalk.cyan(`\nWaiting for authentication on port ${AUTH_CALLBACK_PORT}...`));

    openBrowser(authUrl.toString());

    console.log(chalk.gray(`If the browser doesn't open automatically, visit:`));
    console.log(chalk.underline.blue(authUrl.toString()));
    console.log(chalk.gray('\nPress Ctrl+C to cancel anytime.\n'));
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(chalk.red(`\n❌ Error: Port ${AUTH_CALLBACK_PORT} is already in use.`));
      console.log(chalk.gray('Please close other applications using this port and try again.\n'));
    } else {
      console.error(chalk.red('\n❌ Server error:'), err.message);
    }
    process.exit(1);
  });
};
