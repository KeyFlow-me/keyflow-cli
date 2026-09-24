import path from 'path';

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/** Allowed upload content type for a file, by extension. SVG and anything else return undefined. */
export function imageContentType(filePath: string): string | undefined {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()];
}
