import fs from 'fs';
import { KeyflowError } from '../keyflow-api/keyflow-error.js';
import { readKeyflowError } from '../keyflow-api/read-keyflow-error.js';
import { imageKey } from './image-key.js';
import { prepareImage } from './prepare-image.js';
/**
 * Ask the server which images already exist, upload only the missing ones with the
 * presigned PUT URL, and return the final URL for every local image.
 */
export async function uploadImages(baseUrl, idToken, visibility, images, fetchImpl = fetch) {
    const urls = new Map();
    if (images.length === 0)
        return { urls, uploaded: 0, reused: 0 };
    const prepared = images.map(prepareImage);
    const unique = new Map();
    for (const image of prepared) {
        const key = `${image.usage}:${image.sha256}`;
        if (!unique.has(key))
            unique.set(key, image);
    }
    const slots = await requestSlots(baseUrl, idToken, visibility, [...unique.values()], fetchImpl);
    let uploaded = 0;
    let reused = 0;
    for (const [key, image] of unique) {
        const slot = slots.get(key);
        if (!slot)
            throw new Error(`Server did not return an upload slot for ${image.raw}.`);
        if (!slot.uploadUrl) {
            reused += 1;
            continue;
        }
        const put = await fetchImpl(slot.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': image.contentType, 'Content-Length': String(image.size) },
            body: fs.readFileSync(image.absolutePath),
        });
        if (!put.ok)
            throw new Error(`Uploading ${image.raw} failed (HTTP ${put.status}).`);
        uploaded += 1;
    }
    for (const image of prepared) {
        const slot = slots.get(`${image.usage}:${image.sha256}`);
        if (slot)
            urls.set(imageKey(image.usage, image.absolutePath), slot.url);
    }
    return { urls, uploaded, reused };
}
/** POST /api/cli/images and index the returned slots by `${usage}:${sha256}`. */
async function requestSlots(baseUrl, idToken, visibility, images, fetchImpl) {
    const response = await fetchImpl(`${baseUrl}/api/cli/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
            visibility,
            images: images.map((image) => ({ sha256: image.sha256, size: image.size, contentType: image.contentType, usage: image.usage })),
        }),
    });
    if (response.status === 404) {
        throw new KeyflowError('This KeyFlow server does not support image upload yet.', 404, 'images-not-supported', 'Remove local images or use https:// image URLs, then push again. Nothing was saved.');
    }
    if (!response.ok)
        throw await readKeyflowError(response, 'Image upload request was rejected.');
    const result = (await response.json().catch(() => ({})));
    const slots = new Map();
    for (const entry of result.images ?? []) {
        if (!entry.sha256 || !entry.usage || typeof entry.url !== 'string')
            continue;
        slots.set(`${entry.usage}:${entry.sha256}`, { url: entry.url, uploadUrl: entry.uploadUrl ?? null });
    }
    return slots;
}
