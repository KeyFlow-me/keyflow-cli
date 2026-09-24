import { splitDocument } from './split-document.js';
const BOM = '﻿';
const PLAIN_SCALAR_RE = /^[A-Za-z0-9_][A-Za-z0-9_.:/@%~+\-?=&]*$/;
/**
 * Write `keyflow.id` and `keyflow.url` into the frontmatter of `source`.
 * Every other line is kept byte-for-byte. A frontmatter block is created when missing.
 * This is the only change the CLI ever makes to a user's markdown file.
 */
export function writeKeyflowIdentity(source, id, url) {
    const doc = splitDocument(source);
    const eol = doc.eol;
    const bom = source.startsWith(BOM) ? BOM : '';
    const text = bom ? source.slice(1) : source;
    const identityLines = (indent) => {
        const out = [`${indent}id: ${yamlScalar(id)}`];
        if (url)
            out.push(`${indent}url: ${yamlScalar(url)}`);
        return out;
    };
    if (!doc.hasFrontmatter) {
        const block = ['---', 'keyflow:', ...identityLines('  '), '---'].join(eol) + eol;
        return bom + block + text;
    }
    // Split while keeping each line's own terminator so untouched lines stay byte-identical.
    const parts = text.split(/(?<=\n)/);
    const closingIndex = doc.bodyStartLine - 2; // 0-based index of the closing fence line
    let keyflowIndex = -1;
    for (let i = 1; i < closingIndex; i += 1) {
        if (/^keyflow[ \t]*:/.test(parts[i])) {
            keyflowIndex = i;
            break;
        }
    }
    if (keyflowIndex === -1) {
        parts.splice(closingIndex, 0, ...['keyflow:', ...identityLines('  ')].map((line) => line + eol));
        return bom + parts.join('');
    }
    const afterColon = lineBody(parts[keyflowIndex]).replace(/^keyflow[ \t]*:/, '').trim();
    if (afterColon && !afterColon.startsWith('#')) {
        // Flow or scalar form (e.g. `keyflow: {}`): replace only this line with a block mapping.
        parts.splice(keyflowIndex, 1, ...['keyflow:', ...identityLines('  ')].map((line) => line + eol));
        return bom + parts.join('');
    }
    // Block form: find the child lines of `keyflow:`.
    let indent = '  ';
    let idIndex = -1;
    let urlIndex = -1;
    for (let i = keyflowIndex + 1; i < closingIndex; i += 1) {
        const line = lineBody(parts[i]);
        if (line.trim() !== '' && !/^[ \t]/.test(line))
            break;
        const child = line.match(/^([ \t]+)(id|url)[ \t]*:/);
        if (child) {
            indent = child[1];
            if (child[2] === 'id')
                idIndex = i;
            else
                urlIndex = i;
        }
        else {
            const other = line.match(/^([ \t]+)\S/);
            if (other && idIndex === -1 && urlIndex === -1)
                indent = other[1];
        }
    }
    const [idLine, urlLine] = identityLines(indent);
    const terminatorOf = (part) => part.match(/\r?\n$/)?.[0] ?? eol;
    if (idIndex !== -1)
        parts[idIndex] = idLine + terminatorOf(parts[idIndex]);
    if (url) {
        if (urlIndex !== -1) {
            parts[urlIndex] = urlLine + terminatorOf(parts[urlIndex]);
        }
        else {
            parts.splice(idIndex !== -1 ? idIndex + 1 : keyflowIndex + 1, 0, urlLine + eol);
        }
    }
    if (idIndex === -1)
        parts.splice(keyflowIndex + 1, 0, idLine + eol);
    return bom + parts.join('');
}
function lineBody(part) {
    return part.replace(/\r?\n$/, '');
}
function yamlScalar(value) {
    return PLAIN_SCALAR_RE.test(value) && !value.includes(': ') ? value : JSON.stringify(value);
}
