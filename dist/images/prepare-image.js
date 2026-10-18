import crypto from 'crypto';
import { imageContentType } from './image-content-type.js';
import { ImageFileGuard } from './image-file-guard.js';
/** Read a local image once, re-checking where it lives and what it contains, for the upload request. */
export function prepareImage(image) {
    const contentType = imageContentType(image.absolutePath);
    if (!contentType)
        throw new Error(`Unsupported image type: ${image.raw}`);
    const bytes = ImageFileGuard.read(image);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    return { ...image, contentType, size: bytes.length, sha256, bytes };
}
