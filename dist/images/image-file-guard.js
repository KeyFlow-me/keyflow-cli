import fs from 'fs';
import path from 'path';
import { imageContentType } from './image-content-type.js';
const SIGNATURES = {
    'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    'image/gif': (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1')),
    'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};
function isInside(root, file) {
    const relative = path.relative(root, file);
    return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
/**
 * Reasons this image must not be uploaded: a symlink, or a file whose real location is outside
 * the markdown file's folder. Missing files, type and size are reported by the caller.
 */
function placementProblem(image) {
    if (fs.lstatSync(image.absolutePath).isSymbolicLink()) {
        return { code: 'image-symlink', message: `Image is a symbolic link: ${image.raw}`,
            hint: 'Copy the real image file into the post folder instead of linking to it.' };
    }
    if (!isInside(fs.realpathSync(image.root), fs.realpathSync(image.absolutePath))) {
        return { code: 'image-outside-folder', message: `Image is outside the post folder: ${image.raw}`,
            hint: 'Only images inside the markdown file\'s folder (or its subfolders) are uploaded. Move the image there.' };
    }
    return null;
}
function contentProblem(image, bytes) {
    const contentType = imageContentType(image.absolutePath);
    if (contentType && SIGNATURES[contentType](bytes))
        return null;
    return { code: 'image-content-mismatch', message: `File is not a real ${path.extname(image.absolutePath)} image: ${image.raw}`,
        hint: 'Use an actual PNG, JPEG, WebP, or GIF file whose content matches its extension.' };
}
export const ImageFileGuard = {
    placementProblem,
    contentProblem,
    /** Re-check the file at upload time and return the exact bytes to hash and send. */
    read(image) {
        const problem = placementProblem(image);
        if (problem)
            throw new Error(problem.message);
        const bytes = fs.readFileSync(image.absolutePath);
        const mismatch = contentProblem(image, bytes);
        if (mismatch)
            throw new Error(mismatch.message);
        return bytes;
    },
};
