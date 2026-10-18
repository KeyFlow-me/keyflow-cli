import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { IdTokenCache } from '../account/id-token-cache.js';
import { collectLocalImages } from '../images/collect-local-images.js';
import { imageKey } from '../images/image-key.js';
import { isLocalImagePath } from '../images/is-local-image-path.js';
import { replaceImagePaths } from '../images/replace-image-paths.js';
import { resolveImagePath } from '../images/resolve-image-path.js';
import { uploadImages } from '../images/upload-images.js';
import { getBaseUrl } from '../keyflow-api/base-url.js';
import { fetchCliConfig } from '../keyflow-api/cli-config.js';
import { getIdToken } from '../keyflow-api/get-id-token.js';
import { KeyflowError } from '../keyflow-api/keyflow-error.js';
import { loadConfig } from '../lib/config.js';
import { analyzeMarkdown } from '../markdown-check/analyze-markdown.js';
import { writeKeyflowIdentity } from '../post/write-keyflow-identity.js';
import { uploadPost } from '../post/upload-post.js';
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
    const upload = await uploadImages(send.baseUrl, send.idToken, post.scheduledAt ? 'private' : post.visibility, images);
    stats.uploaded = upload.uploaded;
    stats.reused = upload.reused;
    send.log(chalk.gray(`Images: ${upload.uploaded} uploaded, ${upload.reused} already on KeyFlow`));
    body = replaceImagePaths(body, collectLocalImages(body), (raw) => upload.urls.get(imageKey('content', resolveImagePath(file, raw))));
    if (post.cover && isLocalImagePath(post.cover)) {
        coverImage = upload.urls.get(imageKey('cover', resolveImagePath(file, post.cover)));
    }
    return { body, coverImage, stats };
};
async function requireScheduling(baseUrl) {
    const config = await fetchCliConfig(baseUrl);
    if (!config.ok || !config.scheduledPublishing) {
        throw new KeyflowError('This server does not confirm safe CLI scheduled publishing.', config.status, 'schedule-not-supported', 'Update the KeyFlow server before scheduling. No images or post were uploaded.');
    }
}
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
    const modeLabel = `${post.scheduledAt ? 'schedule' : post.status === 'published' ? 'publish' : 'draft'} (${post.visibility})`;
    const summary = { file: absolutePath, title: post.title, status: post.status, visibility: post.visibility,
        ...(post.scheduledAt ? { scheduledAt: post.scheduledAt } : {}), items: analysis.items };
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
    let config;
    try {
        config = loadConfig(options.account);
    }
    catch (error) {
        fail({}, error instanceof Error ? error.message : 'Could not select the account.', 'Run "keyflow account list" and choose an existing account.', 'account-selection-failed');
    }
    if (!config || (!config.deviceCredential && !config.refreshToken)) {
        fail({}, 'Not logged in.', 'Run "keyflow login" first.', 'not-logged-in');
    }
    try {
        log(chalk.gray(`Account: ${config.accountName || config.username || config.email}`));
        log(chalk.gray('Refreshing secure session token...'));
        const logToken = (message) => log(chalk.gray(message));
        const idToken = await getIdToken(baseUrl, config, logToken);
        if (post.scheduledAt)
            await requireScheduling(baseUrl);
        const send = async (token) => {
            const content = await prepareContent(absolutePath, post, analysis.images, { baseUrl, idToken: token, log });
            log(chalk.gray('Uploading content to KeyFlow...'));
            return { content, saved: await uploadPost(baseUrl, token, post, content.body, content.coverImage) };
        };
        let sent;
        try {
            sent = await send(idToken);
        }
        catch (error) {
            // The server rejects before saving, so a token reused from an earlier push gets one fresh retry.
            if (!(error instanceof KeyflowError) || error.status !== 401 || error.savedPost)
                throw error;
            IdTokenCache.forget(baseUrl, config);
            log(chalk.gray('Session token was rejected. Refreshing it once...'));
            sent = await send(await getIdToken(baseUrl, config, logToken, { fresh: true }));
        }
        const { content, saved } = sent;
        // Remember the post in the file so the next push updates the same post.
        const fileUpdated = saved.postId !== post.postId || Boolean(saved.url && saved.url !== post.existingUrl);
        if (fileUpdated) {
            const current = fs.readFileSync(absolutePath, 'utf8');
            fs.writeFileSync(absolutePath, writeKeyflowIdentity(current, saved.postId, saved.url));
        }
        log(chalk.green.bold(`\n✅ ${post.scheduledAt ? 'Scheduled' : post.status === 'published' ? 'Published' : 'Draft saved'} and verified!`));
        if (saved.schedule)
            log(chalk.gray(`Scheduled for: ${saved.schedule.scheduledAt} (UTC)`));
        log(chalk.gray(`Post ID: ${saved.postId}`));
        if (saved.url)
            log(chalk.gray(`View at: ${saved.url}`));
        log(chalk.gray(`Status: ${modeLabel}${isUpdate ? ' (updated existing post)' : ''}`));
        if (fileUpdated)
            log(chalk.gray('Saved keyflow.id and keyflow.url to the file frontmatter.'));
        log('');
        finish({ ok: true, ...summary, schedule: saved.schedule, account: config.accountName, postId: saved.postId,
            url: saved.url, updated: isUpdate, fileUpdated, images: content.stats }, 0);
    }
    catch (error) {
        if (error instanceof KeyflowError) {
            if (error.savedPost) {
                const saved = error.savedPost;
                fs.writeFileSync(absolutePath, writeKeyflowIdentity(fs.readFileSync(absolutePath, 'utf8'), saved.postId, saved.url));
                fail({ ...summary, ...saved, postSaved: true }, `Push failed: ${error.message}`, error.hint, error.code);
            }
            fail({}, `Push failed: ${error.message}`, error.hint, error.code);
        }
        fail({}, `Push failed: ${error instanceof Error ? error.message : String(error)}`, undefined, 'push-failed');
    }
};
