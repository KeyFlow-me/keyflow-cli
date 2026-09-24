import fs from 'fs';
import path from 'path';

/** Resolve a markdown image path relative to the markdown file (URI-decoded when needed). */
export function resolveImagePath(markdownFile: string, raw: string): string {
  const baseDir = path.dirname(markdownFile);
  const direct = path.resolve(baseDir, raw);
  if (fs.existsSync(direct)) return direct;
  try {
    const decoded = path.resolve(baseDir, decodeURI(raw));
    if (fs.existsSync(decoded)) return decoded;
  } catch {
    // Not URI-encoded; keep the direct path.
  }
  return direct;
}
