import fs from 'node:fs';
import path from 'node:path';
import { KeyflowError } from '../keyflow-api/keyflow-error.js';

/** Read a single UTF-8 document without changing it or discovering adjacent assets. */
export function readHtmlSource(file: string) {
  if (!/\.html?$/i.test(path.extname(file))) invalid('html-file-required', 'Use an .html or .htm file.');
  let bytes: Buffer;
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) invalid('html-file-required', 'Use a regular HTML file.');
    if (stat.size > 1024 * 1024) invalid('html-too-large', 'HTML must be no larger than 1 MiB.');
    bytes = fs.readFileSync(file);
  } catch (error) {
    if (error instanceof KeyflowError) throw error;
    return invalid('html-file-unreadable', 'Could not read the HTML file.');
  }
  if (bytes.length > 1024 * 1024) invalid('html-too-large', 'HTML must be no larger than 1 MiB.');
  let html: string;
  try { html = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return invalid('invalid-utf8', 'HTML must use valid UTF-8.'); }
  if (!html.trim()) invalid('empty-html', 'HTML is empty.');
  if (html.includes('\0')) invalid('invalid-html', 'HTML must not contain NUL characters.');
  return { html, bytes: Buffer.byteLength(html, 'utf8') };
}

function invalid(code: string, message: string): never {
  throw new KeyflowError(message, 400, code);
}
