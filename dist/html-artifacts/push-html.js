import path from 'node:path';
import { KeyflowError } from '../keyflow-api/keyflow-error.js';
import { readHtmlSource } from './read-source.js';
import { resolveHtmlInput } from './resolve-input.js';
import { htmlArtifactResponse } from './response.js';
import { createHtmlSession } from './session.js';
/** Publish one immutable source snapshot; only explicit --id updates an existing artifact. */
export async function pushHtml(filePath, options) {
    const file = path.resolve(filePath);
    const source = readHtmlSource(file);
    const checked = resolveHtmlInput(source.html, options);
    if (options.dryRun) {
        return { ok: true, dryRun: true, file, bytes: source.bytes,
            ...(options.id ? { artifactId: options.id, update: true, metadata: 'retained-from-server-on-upload' } : {}),
            ...(checked.title ? { title: checked.title } : {}),
            ...(!options.id || options.publish || options.draft ? { status: checked.status } : {}),
            ...(!options.id || options.as ? { publication: checked.publication } : {}),
            ...(checked.language ? { language: checked.language } : {}) };
    }
    const session = await createHtmlSession(options.account);
    let previous;
    if (options.id) {
        const detail = await session.request(`/api/cli/html?artifactId=${encodeURIComponent(options.id)}`);
        previous = htmlArtifactResponse.summary(detail.artifact, session.uid);
        if (previous.id !== options.id)
            throw new KeyflowError('The server returned another HTML artifact.', 502, 'invalid-html-response');
    }
    const input = resolveHtmlInput(source.html, options, previous);
    const saved = await session.request('/api/cli/html', { method: 'POST', body: JSON.stringify(input) });
    const artifact = htmlArtifactResponse.summary(saved.artifact, session.uid);
    if ((options.id && artifact.id !== options.id) || artifact.version !== (previous?.version ?? 0) + 1) {
        throw new KeyflowError('The server did not confirm the expected HTML version.', 502, 'invalid-html-response');
    }
    const url = htmlArtifactResponse.url(saved.url, session.origin);
    return { ok: true, file, artifact, url, updated: Boolean(options.id), account: session.account };
}
