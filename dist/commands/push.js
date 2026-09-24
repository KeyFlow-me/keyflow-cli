import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { collectLocalImages } from '../images/collect-local-images.js';
import { imageKey } from '../images/image-key.js';
import { isLocalImagePath } from '../images/is-local-image-path.js';
import { replaceImagePaths } from '../images/replace-image-paths.js';
import { resolveImagePath } from '../images/resolve-image-path.js';
import { uploadImages } from '../images/upload-images.js';
import { getBaseUrl } from '../keyflow-api/base-url.js';
import { getIdToken } from '../keyflow-api/get-id-token.js';
import { KeyflowError } from '../keyflow-api/keyflow-error.js';
import { readKeyflowError } from '../keyflow-api/read-keyflow-error.js';
import { loadConfig } from '../lib/config.js';
import { analyzeMarkdown } from '../markdown-check/analyze-markdown.js';
import { writeKeyflowIdentity } from '../post/write-keyflow-identity.js';
import { printCheckItems } from './print-check-items.js';
const createReporter = (json, file) => {
    const finish = (result, exitCode) => {
        if (json)
            console.log(JSON.stringify(result, null, 2));
        process.exit(exitCode);
    };
    return {
        log: (message) => {
            if (!json)
                console.log(message);
        },
        finish,
        fail: (extra, message, hint, code) => {
            if (!json) {
                console.error(chalk.red(`\n❌ ${message}`));
                if (hint)
                    console.error(chalk.yellow(`Hint: ${hint}`));
                console.error('');
            }
            return finish({ ok: false, file, ...extra, error: { code, message, hint } }, 1);
        },
    };
};
/** Upload local images and return the body and cover URL to send. The source file is never changed. */
const prepareContent = async (file, post, images, send) => {
    let body = post.body;
    let coverImage = post.cover && !isLocalImagePath(post.cover) ? post.cover : undefined;
    const stats = { total: images.length, uploaded: 0, reused: 0 };
    if (images.length === 0)
        return { body, coverImage, stats };
    send.log(chalk.gray(`Checking ${images.length} image(s)...`));
    const upload = await uploadImages(send.baseUrl, send.idToken, post.visibility, images);
    stats.uploaded = upload.uploaded;
    stats.reused = upload.reused;
    send.log(chalk.gray(`Images: ${upload.uploaded} uploaded, ${upload.reused} already on KeyFlow`));
    body = replaceImagePaths(body, collectLocalImages(body), (raw) => upload.urls.get(imageKey('content', resolveImagePath(file, raw))));
    if (post.cover && isLocalImagePath(post.cover)) {
        coverImage = upload.urls.get(imageKey('cover', resolveImagePath(file, post.cover)));
    }
    return { body, coverImage, stats };
};
/** POST /api/cli/draft and return the verified `{ postId, url }`. */
const saveDraft = async (baseUrl, idToken, post, body, coverImage) => {
    const payload = {
        title: post.title,
        content: body,
        status: post.status,
        visibility: post.visibility,
    };
    if (post.tags.length > 0)
        payload.tags = post.tags;
    if (coverImage)
        payload.coverImage = coverImage;
    if (post.postId)
        payload.postId = post.postId;
    if (post.language)
        payload.language = post.language;
    if (post.summary)
        payload.summary = post.summary;
    const response = await fetch(`${baseUrl}/api/cli/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        throw await readKeyflowError(response, 'Server rejected the upload');
    }
    const result = (await response.json().catch(() => ({})));
    if (!result.success) {
        throw new Error('Server rejected the upload');
    }
    if (!result.postId || typeof result.postId !== 'string') {
        throw new Error('Upload response did not include a postId.');
    }
    return { postId: result.postId, url: typeof result.url === 'string' ? result.url : undefined };
};
export const pushCommand = async (filePath, options = {}) => {
    const baseUrl = getBaseUrl();
    const absolutePath = path.resolve(process.cwd(), filePath);
    const { log, finish, fail } = createReporter(options.json === true, absolutePath);
    if (!fs.existsSync(absolutePath))
        fail({}, `File not found at ${absolutePath}`, undefined, 'file-not-found');
    const source = fs.readFileSync(absolutePath, 'utf8');
    if (!source.trim())
        fail({}, 'Markdown file is empty.', undefined, 'empty-content');
    // The same offline checks as `keyflow check` run before anything leaves this machine.
    const analysis = analyzeMarkdown(absolutePath, source, options.publish);
    if (!options.json && analysis.items.length > 0)
        printCheckItems(absolutePath, analysis.items);
    if (analysis.errors > 0 || !analysis.post) {
        fail({ items: analysis.items }, `Found ${analysis.errors} problem(s). Nothing was uploaded.`, 'Fix the problems above, or run "keyflow check <file>" to see them again.', 'check-failed');
    }
    const post = analysis.post;
    const isUpdate = Boolean(post.postId);
    const modeLabel = `${post.status === 'published' ? 'publish' : 'draft'} (${post.visibility})`;
    const summary = { file: absolutePath, title: post.title, status: post.status, visibility: post.visibility, items: analysis.items };
    log(chalk.blue(`\n📤 Preparing to push: ${chalk.bold(post.title)}`));
    log(chalk.gray(`Title source: ${post.titleSource}`));
    log(chalk.gray(`Target: ${baseUrl}`));
    log(chalk.gray(`Mode: ${modeLabel}${isUpdate ? `, updating ${post.postId}` : ', new post'}`));
    if (analysis.images.length > 0)
        log(chalk.gray(`Local images: ${analysis.images.length}`));
    if (options.dryRun) {
        log(chalk.green.bold('\n✅ Dry run passed.'));
        log(chalk.gray(`Characters: ${post.body.length}`));
        log(chalk.gray('No network request was sent.\n'));
        finish({ ok: true, dryRun: true, ...summary, postId: post.postId, images: { total: analysis.images.length, uploaded: 0, reused: 0 } }, 0);
    }
    const config = loadConfig();
    if (!config || (!config.deviceCredential && !config.refreshToken)) {
        fail({}, 'Not logged in.', 'Run "keyflow login" first.', 'not-logged-in');
    }
    try {
        log(chalk.gray('Refreshing secure session token...'));
        const idToken = await getIdToken(baseUrl, config, (message) => log(chalk.gray(message)));
        const content = await prepareContent(absolutePath, post, analysis.images, { baseUrl, idToken, log });
        log(chalk.gray('Uploading content to KeyFlow...'));
        const saved = await saveDraft(baseUrl, idToken, post, content.body, content.coverImage);
        // Remember the post in the file so the next push updates the same post.
        const fileUpdated = saved.postId !== post.postId || Boolean(saved.url && saved.url !== post.existingUrl);
        if (fileUpdated) {
            const current = fs.readFileSync(absolutePath, 'utf8');
            fs.writeFileSync(absolutePath, writeKeyflowIdentity(current, saved.postId, saved.url));
        }
        log(chalk.green.bold(`\n✅ ${post.status === 'published' ? 'Published' : 'Draft saved'} and verified!`));
        log(chalk.gray(`Post ID: ${saved.postId}`));
        if (saved.url)
            log(chalk.gray(`View at: ${saved.url}`));
        log(chalk.gray(`Status: ${modeLabel}${isUpdate ? ' (updated existing post)' : ''}`));
        if (fileUpdated)
            log(chalk.gray('Saved keyflow.id and keyflow.url to the file frontmatter.'));
        log('');
        finish({ ok: true, ...summary, postId: saved.postId, url: saved.url, updated: isUpdate, fileUpdated, images: content.stats }, 0);
    }
    catch (error) {
        if (error instanceof KeyflowError)
            fail({}, `Push failed: ${error.message}`, error.hint, error.code);
        fail({}, `Push failed: ${error instanceof Error ? error.message : String(error)}`, undefined, 'push-failed');
    }
};
