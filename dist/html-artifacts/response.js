import { KeyflowError } from '../keyflow-api/keyflow-error.js';
function summary(value, uid) {
    const item = value;
    if (!item || typeof item !== 'object' || Array.isArray(item)
        || !segment(item.id) || !segment(item.authorId) || (uid !== 'env-uid' && item.authorId !== uid)
        || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120
        || typeof item.description !== 'string' || item.description.length > 500
        || !['draft', 'published'].includes(String(item.status))
        || !Number.isSafeInteger(item.version) || item.version < 1
        || !Number.isSafeInteger(item.bytes) || item.bytes < 1 || item.bytes > 1024 * 1024
        || typeof item.createdAt !== 'string' || typeof item.updatedAt !== 'string'
        || (item.publication !== undefined && !['post', 'link'].includes(String(item.publication)))
        || (item.language !== undefined && !['ko', 'en'].includes(String(item.language))))
        invalid();
    return {
        id: item.id, authorId: item.authorId, title: item.title,
        description: item.description, status: item.status,
        version: item.version, bytes: item.bytes,
        createdAt: item.createdAt, updatedAt: item.updatedAt,
        ...(item.publication ? { publication: item.publication } : {}),
        ...(item.language ? { language: item.language } : {}),
        ...(typeof item.postSlug === 'string' ? { postSlug: item.postSlug } : {}),
        ...(typeof item.authorHandle === 'string' ? { authorHandle: item.authorHandle } : {}),
        ...(['public', 'private', 'followers'].includes(String(item.visibility)) ? { visibility: item.visibility } : {}),
        ...(item.orphaned === true ? { orphaned: true } : {}),
    };
}
function url(value, origin) {
    if (typeof value !== 'string' || !value)
        invalid();
    let parsed;
    try {
        parsed = new URL(value, origin);
    }
    catch {
        return invalid();
    }
    if (parsed.origin !== origin || parsed.username || parsed.password || parsed.search || parsed.hash)
        invalid();
    return parsed.toString();
}
function segment(value) { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value); }
function invalid() { throw new KeyflowError('The server did not confirm a valid HTML result.', 502, 'invalid-html-response'); }
/** Select safe metadata only; server HTML, storage keys and unknown fields are never printed. */
export const htmlArtifactResponse = { summary, url };
