import fs from 'fs';
import { imageContentType } from '../images/image-content-type.js';
import { ImageFileGuard } from '../images/image-file-guard.js';
import { IMAGE_LIMITS } from '../images/image-limits.js';
import type { LocalImage } from '../images/local-image.js';
import type { CheckItem } from './check-item.js';

/** Return the problem with a local image (missing, linked or outside the post folder, wrong type or content, too large), or null. */
export function findImageProblem(image: LocalImage): CheckItem | null {
  const label = image.usage === 'cover' ? 'Cover image' : 'Image';
  const exists = fs.existsSync(image.absolutePath);
  const placement = exists || isDanglingLink(image.absolutePath) ? ImageFileGuard.placementProblem(image) : null;
  if (placement) return { ...placement, line: image.line, severity: 'error' };
  if (!exists || !fs.statSync(image.absolutePath).isFile()) {
    return {
      code: 'missing-image',
      line: image.line,
      message: `${label} not found: ${image.raw}`,
      hint: 'Paths are resolved relative to the markdown file. Fix the path or add the file.',
      severity: 'error',
    };
  }
  if (!imageContentType(image.absolutePath)) {
    return {
      code: 'unsupported-image-type',
      line: image.line,
      message: `${label} type is not supported: ${image.raw}`,
      hint: 'Use PNG, JPEG, WebP, or GIF. SVG is not accepted.',
      severity: 'error',
    };
  }
  const size = fs.statSync(image.absolutePath).size;
  if (size > IMAGE_LIMITS.maxBytes) {
    return {
      code: 'image-too-large',
      line: image.line,
      message: `${label} is ${(size / 1024 / 1024).toFixed(1)}MB: ${image.raw}`,
      hint: 'Each image must be 10MB or smaller. Resize or compress it.',
      severity: 'error',
    };
  }
  const mismatch = ImageFileGuard.contentProblem(image, readHead(image.absolutePath));
  if (mismatch) return { ...mismatch, line: image.line, severity: 'error' };
  return null;
}

function isDanglingLink(file: string) {
  try { return fs.lstatSync(file).isSymbolicLink(); } catch { return false; }
}

/** The first bytes are enough to recognise every supported image format. */
function readHead(file: string): Buffer {
  const fd = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(16);
    return head.subarray(0, fs.readSync(fd, head, 0, head.length, 0));
  } finally {
    fs.closeSync(fd);
  }
}
