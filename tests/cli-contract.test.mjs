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

test('push validates draft uploads and supports local dry runs', () => {
  assert.match(indexSource, /\.option\('--dry-run'/);
  assert.match(pushSource, /status:\s*'draft'/);
  assert.match(pushSource, /visibility:\s*'private'/);
  assert.match(pushSource, /!result\.postId/);
  assert.match(pushSource, /Draft uploaded and verified/);
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
