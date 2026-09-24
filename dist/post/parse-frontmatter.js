import { parse as parseYaml } from 'yaml';
import { FrontmatterError } from './frontmatter-error.js';
/** Parse the YAML frontmatter into known post fields. Unknown keys are ignored. */
export function parseFrontmatter(doc) {
    if (!doc.hasFrontmatter || !doc.yaml.trim())
        return { tags: [] };
    let data;
    try {
        data = parseYaml(doc.yaml);
    }
    catch (error) {
        const linePos = error.linePos;
        const line = linePos?.[0]?.line ? linePos[0].line + 1 : 1;
        const message = error instanceof Error ? error.message.split('\n')[0] : 'Invalid YAML';
        throw new FrontmatterError(`Invalid frontmatter YAML: ${message}`, line);
    }
    if (data === null || data === undefined)
        return { tags: [] };
    if (typeof data !== 'object' || Array.isArray(data)) {
        throw new FrontmatterError('Frontmatter must be a YAML mapping (key: value).', 1);
    }
    const record = data;
    const keyflow = (record.keyflow && typeof record.keyflow === 'object' ? record.keyflow : {});
    return {
        title: asString(record.title),
        tags: asTags(record.tags),
        publish: asBoolean(record.publish),
        visibility: asString(record.visibility)?.toLowerCase(),
        series: asString(record.series),
        cover: asString(record.cover),
        summary: asString(record.summary),
        language: asString(record.language),
        keyflowId: asString(keyflow.id),
        keyflowUrl: asString(keyflow.url),
    };
}
function asString(value) {
    if (value === null || value === undefined)
        return undefined;
    if (typeof value === 'string')
        return value.trim() || undefined;
    if (typeof value === 'number' || typeof value === 'boolean')
        return String(value);
    if (value instanceof Date)
        return value.toISOString();
    return undefined;
}
function asTags(value) {
    const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
    const tags = [];
    for (const item of raw) {
        const tag = asString(item)?.replace(/^#+/, '').trim();
        if (tag && !tags.includes(tag))
            tags.push(tag);
    }
    return tags;
}
function asBoolean(value) {
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        const lowered = value.trim().toLowerCase();
        if (lowered === 'true' || lowered === 'yes')
            return true;
        if (lowered === 'false' || lowered === 'no')
            return false;
    }
    return undefined;
}
