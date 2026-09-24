import { AGENT_BLOCK } from './agent-block.js';
/**
 * Insert or replace the marked KeyFlow block. Content outside the markers is never changed.
 * `newFilePrefix` is written before the block only when the file is new or empty.
 */
export function upsertAgentBlock(existing, newFilePrefix = '') {
    const block = AGENT_BLOCK.text;
    if (existing === null || existing === '') {
        return `${newFilePrefix}${newFilePrefix ? '\n' : ''}${block}\n`;
    }
    const eol = existing.includes('\r\n') ? '\r\n' : '\n';
    const start = existing.indexOf(AGENT_BLOCK.start);
    if (start !== -1) {
        const end = existing.indexOf(AGENT_BLOCK.end, start);
        if (end === -1) {
            throw new Error(`Found ${AGENT_BLOCK.start} without ${AGENT_BLOCK.end}. Fix the file by hand and run again.`);
        }
        return existing.slice(0, start) + block.replace(/\n/g, eol) + existing.slice(end + AGENT_BLOCK.end.length);
    }
    const separator = existing.endsWith(eol + eol) ? '' : existing.endsWith(eol) ? eol : eol + eol;
    return existing + separator + block.replace(/\n/g, eol) + eol;
}
