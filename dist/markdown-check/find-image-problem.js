import fs from 'fs';
import { imageContentType } from '../images/image-content-type.js';
import { IMAGE_LIMITS } from '../images/image-limits.js';
/** Return the problem with a local image (missing, unsupported type, too large), or null. */
export function findImageProblem(image) {
    const label = image.usage === 'cover' ? 'Cover image' : 'Image';
    if (!fs.existsSync(image.absolutePath) || !fs.statSync(image.absolutePath).isFile()) {
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
    return null;
}
