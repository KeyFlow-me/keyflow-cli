import crypto from 'crypto';
import fs from 'fs';
import { imageContentType } from './image-content-type.js';
import type { LocalImage } from './local-image.js';

export type PreparedImage = LocalImage & {
  sha256: string;
  size: number;
  contentType: string;
};

/** Hash a local image and read its size and content type for the upload request. */
export function prepareImage(image: LocalImage): PreparedImage {
  const contentType = imageContentType(image.absolutePath);
  if (!contentType) throw new Error(`Unsupported image type: ${image.raw}`);
  const size = fs.statSync(image.absolutePath).size;
  const sha256 = crypto.createHash('sha256').update(fs.readFileSync(image.absolutePath)).digest('hex');
  return { ...image, contentType, size, sha256 };
}
