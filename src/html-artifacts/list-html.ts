import { KeyflowError } from '../keyflow-api/keyflow-error.js';
import { htmlArtifactResponse } from './response.js';
import { createHtmlSession } from './session.js';

/** Read the bounded owner metadata list without fetching HTML source or storage objects. */
export async function listHtml(account?: string) {
  const session = await createHtmlSession(account);
  const result = await session.request('/api/cli/html');
  if (!Array.isArray(result.artifacts) || result.artifacts.length > 50) {
    throw new KeyflowError('The server did not confirm a valid HTML list.', 502, 'invalid-html-response');
  }
  const artifacts = result.artifacts.map(item => htmlArtifactResponse.summary(item, session.uid));
  return { ok: true, artifacts, account: session.account };
}
