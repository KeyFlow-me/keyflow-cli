import { KeyflowError } from '../keyflow-api/keyflow-error.js';
import type { HtmlArtifactContracts as Contract } from '../html-artifacts/contracts.js';
import { listHtml } from '../html-artifacts/list-html.js';
import { pushHtml } from '../html-artifacts/push-html.js';

async function report(json: boolean, action: () => Promise<Record<string, unknown>>) {
  try {
    const result = await action();
    if (json) console.log(JSON.stringify(result, null, 2));
    else if (Array.isArray(result.artifacts)) {
      if (!result.artifacts.length) console.log('No HTML artifacts.');
      for (const item of result.artifacts as Contract['Summary'][]) {
        const visibility = item.orphaned ? 'orphaned' : item.visibility ?? (item.status === 'published' ? 'public' : 'owner-only');
        console.log(`${item.id}\t${item.publication ?? 'post'}\t${item.status}\t${visibility}\t${item.title}`);
      }
    } else {
      const artifact = result.artifact as Contract['Summary'] | undefined;
      console.log(result.dryRun ? 'HTML dry run passed. No network request was sent.' : `HTML ${result.updated ? 'updated' : 'saved'}: ${artifact!.id}`);
      if (result.url) console.log(String(result.url));
    }
  } catch (error) {
    const known = error instanceof KeyflowError;
    const failure = { ok: false, error: {
      code: known ? error.code : 'html-request-failed',
      message: known ? error.message : 'HTML request failed. If a save was attempted, run "keyflow html list" before retrying.',
      ...(known && error.hint ? { hint: error.hint } : {}),
    } };
    if (json) console.log(JSON.stringify(failure, null, 2));
    else console.error(failure.error.message);
    process.exitCode = 1;
  }
}

export const HtmlCommands = {
  push: (file: string, options: Contract['Options']) => report(options.json === true, () => pushHtml(file, options)),
  list: (options: { json?: boolean; account?: string }) => report(options.json === true, () => listHtml(options.account)),
};
