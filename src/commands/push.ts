import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { createDeviceIdToken } from '../auth/device-auth.js';
import { loadConfig } from '../lib/config.js';

type PushOptions = {
  dryRun?: boolean;
};

type DraftUploadResponse = {
  success?: boolean;
  error?: string;
  postId?: string;
  url?: string;
};

export const pushCommand = async (filePath: string, options: PushOptions = {}) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.keyflow.me';

  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(chalk.red(`\n❌ Error: File not found at ${absolutePath}`));
    process.exit(1);
  }

  const content = fs.readFileSync(absolutePath, 'utf8');
  if (!content.trim()) {
    console.error(chalk.red('\n❌ Error: Markdown file is empty.'));
    process.exit(1);
  }
  
  // Extract real title from Markdown H1 if exists
  const h1Match = content.match(/^#\s+(.+)$/m);
  const realTitle = h1Match ? h1Match[1].trim() : path.basename(filePath, '.md');

  console.log(chalk.blue(`\n📤 Preparing to push draft: ${chalk.bold(realTitle)}...`));
  if (h1Match) console.log(chalk.gray(`(Extracted title from Markdown H1)`));
  console.log(chalk.gray(`Target: ${baseUrl}`));
  console.log(chalk.gray(`Mode: private draft`));

  if (options.dryRun) {
    console.log(chalk.green.bold('\n✅ Dry run passed.'));
    console.log(chalk.gray(`File: ${absolutePath}`));
    console.log(chalk.gray(`Title: ${realTitle}`));
    console.log(chalk.gray(`Characters: ${content.length}`));
    console.log(chalk.gray('No network request was sent.\n'));
    return;
  }

  const config = loadConfig();
  if (!config || (!config.deviceCredential && !config.refreshToken)) {
    console.error(chalk.red('\n❌ Error: Not logged in.'));
    console.log(chalk.gray('Please run "keyflow login" first.\n'));
    process.exit(1);
  }

  try {
    console.log(chalk.gray('Refreshing secure session token...'));
    
    // Exchange the saved local session for a short-lived Firebase ID token.
    // The browser login callback never sends this refresh token directly.
    const idToken = config.deviceCredential
        ? (await createDeviceIdToken({ baseUrl, deviceCredential: config.deviceCredential })).idToken
        : await createLegacyRefreshIdToken(baseUrl, config.refreshToken!);

    console.log(chalk.gray('Uploading content to KeyFlow...'));

    const response = await fetch(`${baseUrl}/api/cli/draft`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
            title: realTitle,
            content,
            status: 'draft',
            visibility: 'private',
        })
    });

    const result = await response.json().catch(() => ({})) as DraftUploadResponse;

    if (!response.ok || !result.success) {
        throw new Error(result.error || 'Server rejected the upload');
    }

    if (!result.postId || typeof result.postId !== 'string') {
        throw new Error('Upload response did not include a draft postId.');
    }

    console.log(chalk.green.bold('\n✅ Draft uploaded and verified!'));
    console.log(chalk.gray(`Draft ID: ${result.postId}`));
    if (result.url) {
        console.log(chalk.gray(`View at: ${result.url}`));
    }
    console.log(chalk.gray('Status: private draft\n'));
    
    process.exit(0);
  } catch (error: any) {
    console.error(chalk.red('\n❌ Push failed:'), error.message);
    process.exit(1);
  }
};

async function createLegacyRefreshIdToken(baseUrl: string, refreshToken: string) {
  console.log(chalk.gray('Using legacy refresh-token session. Run "keyflow login" to migrate this device.'));
  const configRes = await fetch(`${baseUrl}/api/cli/config`);
  if (!configRes.ok) {
      throw new Error('Failed to retrieve KeyFlow platform configuration');
  }
  const { apiKey } = await configRes.json();
  const refreshRes = await fetch(`https://securetoken.googleapis.com/v1/token?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
      }).toString()
  });

  const refreshData = await refreshRes.json().catch(() => ({}));
  if (!refreshData.id_token) {
      throw new Error('Session expired. Please run "keyflow login" again.');
  }
  return refreshData.id_token as string;
}
