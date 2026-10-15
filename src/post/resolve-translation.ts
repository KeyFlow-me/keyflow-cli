import fs from 'fs';
import path from 'path';
import { FrontmatterError } from './frontmatter-error.js';
import { parseFrontmatter } from './parse-frontmatter.js';
import { splitDocument } from './split-document.js';
import type { TranslationResult } from './translation-result.js';

const MARKDOWN_EXT_RE = /\.(md|markdown|mdx)$/i;

/** A `translation_of` value is a file path when it has a path separator or a markdown extension; otherwise a post id. */
function isTranslationPath(value: string): boolean {
  return /[\\/]/.test(value) || MARKDOWN_EXT_RE.test(value);
}

/**
 * Resolve `translation_of` to the KeyFlow post id of the other language version.
 * A path is resolved relative to `filePath` and must already be pushed (have `keyflow.id`).
 * When both files set `language`, they must differ.
 */
export function resolveTranslation(filePath: string, value: string, language?: string): TranslationResult {
  if (!isTranslationPath(value)) return { ok: true, postId: value };

  const target = path.resolve(path.dirname(filePath), value);
  if (target === path.resolve(filePath)) {
    return { ok: false, code: 'invalid-translation', message: 'translation_of points to this file.', hint: 'Point it at the other language version of this post.' };
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    return { ok: false, code: 'missing-translation', message: `translation_of file not found: ${value}`, hint: 'Use a path relative to this file, or a KeyFlow post id.' };
  }

  let meta;
  try {
    meta = parseFrontmatter(splitDocument(fs.readFileSync(target, 'utf8')));
  } catch (error) {
    if (!(error instanceof FrontmatterError)) throw error;
    return { ok: false, code: 'invalid-translation', message: `translation_of file has invalid frontmatter: ${value}`, hint: `Run "keyflow check ${path.relative(process.cwd(), target) || target}" and fix it first.` };
  }
  if (language && meta.language && language.toLowerCase() === meta.language.toLowerCase()) {
    return { ok: false, code: 'same-language-translation', message: `This file and ${value} both use language "${language}".`, hint: 'A translation must use a different language. Fix `language` in one of the files.' };
  }
  if (!meta.keyflowId) {
    const pushPath = path.relative(process.cwd(), target) || target;
    return { ok: false, code: 'translation-not-pushed', message: `${value} has no keyflow.id yet.`, hint: `Push it first with "keyflow push ${pushPath}", then push this file.` };
  }
  return { ok: true, postId: meta.keyflowId };
}
