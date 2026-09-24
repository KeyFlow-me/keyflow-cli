import fs from 'fs';
import os from 'os';
import path from 'path';
import { getBaseUrl } from '../keyflow-api/base-url.js';
import { FALLBACK_GUIDE } from './fallback-guide.js';

export type GuideResult = {
  markdown: string;
  source: 'server' | 'cache' | 'bundled';
  version?: string;
  reason?: string;
};

type LoadGuideOptions = {
  baseUrl?: string;
  homeDir?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

/**
 * Fetch the latest guide and cache it in `~/.keyflow/guide.md` (+ `guide.version`).
 * On failure, fall back to the cache and then to the bundled copy.
 */
export async function loadGuide(options: LoadGuideOptions = {}): Promise<GuideResult> {
  const baseUrl = options.baseUrl ?? getBaseUrl();
  const fetchImpl = options.fetchImpl ?? fetch;
  const dir = path.join(options.homeDir ?? os.homedir(), '.keyflow');
  const guidePath = path.join(dir, 'guide.md');
  const versionPath = path.join(dir, 'guide.version');
  let reason: string;

  try {
    const response = await fetchImpl(`${baseUrl}/api/cli/guide`, {
      headers: { Accept: 'text/markdown' },
      signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
    });
    const markdown = response.ok ? await response.text() : '';
    if (response.ok && markdown.trim()) {
      const version = response.headers.get('X-KeyFlow-Guide-Version') ?? undefined;
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(guidePath, markdown);
        fs.writeFileSync(versionPath, `${version ?? ''}\n`);
      } catch {
        // A read-only home must not block printing the guide.
      }
      return { markdown, source: 'server', version };
    }
    reason = `server returned HTTP ${response.status}`;
  } catch (error) {
    reason = error instanceof Error ? error.message : String(error);
  }

  if (fs.existsSync(guidePath)) {
    const markdown = fs.readFileSync(guidePath, 'utf8');
    if (markdown.trim()) {
      const version = fs.existsSync(versionPath) ? fs.readFileSync(versionPath, 'utf8').trim() || undefined : undefined;
      return { markdown, source: 'cache', version, reason };
    }
  }
  return { markdown: FALLBACK_GUIDE, source: 'bundled', reason };
}
