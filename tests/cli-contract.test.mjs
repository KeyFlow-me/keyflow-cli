import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const indexSource = readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
const pushSource = readFileSync(new URL('../src/commands/push.ts', import.meta.url), 'utf8');
const logoutSource = readFileSync(new URL('../src/commands/logout.ts', import.meta.url), 'utf8');
const updateSource = readFileSync(new URL('../src/commands/update.ts', import.meta.url), 'utf8');
const versionSource = readFileSync(new URL('../src/commands/version.ts', import.meta.url), 'utf8');
const checkForUpdateSource = readFileSync(new URL('../src/version/check-for-update.ts', import.meta.url), 'utf8');
const compareVersionsSource = readFileSync(new URL('../src/version/compare-versions.ts', import.meta.url), 'utf8');
const fetchLatestVersionSource = readFileSync(new URL('../src/version/fetch-latest-version.ts', import.meta.url), 'utf8');

test('registers the complete local account command set', () => {
  assert.match(indexSource, /\.command\('login'\)/);
  assert.match(indexSource, /\.command\('logout'\)/);
  assert.match(indexSource, /\.command\('status'\)/);
  assert.match(indexSource, /\.command\('version'\)/);
  assert.match(indexSource, /\.command\('update'\)/);
  assert.match(indexSource, /\.command\('push'\)/);
});

test('logout clears only local CLI session state', () => {
  assert.match(logoutSource, /clearConfig\(\)/);
  assert.match(logoutSource, /Could not remove every local KeyFlow session file/);
  assert.match(logoutSource, /KEYFLOW_DEVICE_CREDENTIAL/);
  assert.match(logoutSource, /KEYFLOW_REFRESH_TOKEN/);
});

test('push validates uploads, runs offline checks first, and supports dry runs', () => {
  assert.match(indexSource, /\.option\('--dry-run'/);
  assert.match(indexSource, /\.option\('--publish'/);
  assert.match(indexSource, /\.option\('--json'/);
  assert.match(pushSource, /analyzeMarkdown\(/);
  assert.match(pushSource, /status:\s*post\.status/);
  assert.match(pushSource, /visibility:\s*post\.visibility/);
  assert.match(pushSource, /!result\.postId/);
  assert.match(pushSource, /writeKeyflowIdentity\(/);
});

test('registers the AI agent commands and puts the guide hint first in help', () => {
  assert.match(indexSource, /\.command\('check'\)/);
  assert.match(indexSource, /\.command\('guide'\)/);
  assert.match(indexSource, /\.command\('agent'\)/);
  assert.match(indexSource, /\.command\('setup'\)/);
  assert.match(indexSource, /addHelpText\('beforeAll'/);
  assert.match(indexSource, /run `keyflow guide` first/);
});

test('update is explicit before running npm install globally', () => {
  assert.match(updateSource, /options\.yes/);
  assert.match(updateSource, /'install', '-g'/);
  assert.match(updateSource, /spawnSync\('npm'/);
});

test('version and update commands use npm registry version comparison', () => {
  assert.match(versionSource, /checkForUpdate/);
  assert.match(fetchLatestVersionSource, /registry\.npmjs\.org/);
  assert.match(checkForUpdateSource, /compareVersions/);
  assert.match(compareVersionsSource, /parseVersionPart/);
});
