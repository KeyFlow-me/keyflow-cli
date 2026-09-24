import path from 'path';
import { IMAGE_LIMITS } from '../images/image-limits.js';
import { collectLocalImages } from '../images/collect-local-images.js';
import { isLocalImagePath } from '../images/is-local-image-path.js';
import { resolveImagePath } from '../images/resolve-image-path.js';
import { FrontmatterError } from '../post/frontmatter-error.js';
import { parseFrontmatter } from '../post/parse-frontmatter.js';
import { resolvePost } from '../post/resolve-post.js';
import { splitDocument } from '../post/split-document.js';
import { findBlockProblems } from './find-block-problems.js';
import { findImageProblem } from './find-image-problem.js';
const VISIBILITIES = ['public', 'followers', 'private'];
/**
 * Offline analysis shared by `keyflow check` and `keyflow push`. Never touches the network.
 * `publish` mirrors the `--publish` flag.
 */
export function analyzeMarkdown(filePath, source, publish) {
    const items = [];
    const doc = splitDocument(source);
    const images = [];
    let post;
    try {
        const fallbackTitle = path.basename(filePath, path.extname(filePath));
        post = resolvePost(doc, parseFrontmatter(doc), { publish, fallbackTitle });
    }
    catch (error) {
        if (!(error instanceof FrontmatterError))
            throw error;
        items.push({
            code: 'invalid-frontmatter',
            line: error.line,
            message: error.message,
            hint: 'Fix the YAML between the --- lines at the top of the file.',
            severity: 'error',
        });
    }
    if (post && !VISIBILITIES.includes(post.visibility)) {
        items.push({
            code: 'invalid-visibility',
            line: frontmatterKeyLine(doc.yaml, 'visibility'),
            message: `Unknown visibility "${post.visibility}".`,
            hint: `Use one of: ${VISIBILITIES.join(', ')}.`,
            severity: 'error',
        });
    }
    if (post && !post.body.trim()) {
        items.push({
            code: 'empty-content',
            line: doc.bodyStartLine,
            message: 'The post body is empty.',
            hint: 'Write some content below the title.',
            severity: 'error',
        });
    }
    items.push(...findBlockProblems(doc.body, doc.bodyStartLine));
    const candidates = [];
    if (post?.cover && isLocalImagePath(post.cover)) {
        const line = frontmatterKeyLine(doc.yaml, 'cover');
        candidates.push({ raw: post.cover, absolutePath: resolveImagePath(filePath, post.cover), usage: 'cover', line });
    }
    for (const ref of collectLocalImages(doc.body)) {
        const line = doc.bodyStartLine + ref.line - 1;
        candidates.push({ raw: ref.raw, absolutePath: resolveImagePath(filePath, ref.raw), usage: 'content', line });
    }
    const seen = new Set();
    for (const image of candidates) {
        const key = `${image.usage}:${image.absolutePath}`;
        if (seen.has(key))
            continue;
        seen.add(key);
        const problem = findImageProblem(image);
        if (problem)
            items.push(problem);
        else
            images.push(image);
    }
    if (seen.size > IMAGE_LIMITS.maxPerPush) {
        items.push({
            code: 'too-many-images',
            line: 1,
            message: `This post references ${seen.size} local images.`,
            hint: `A single push can upload at most ${IMAGE_LIMITS.maxPerPush} images. Split the post or remove some images.`,
            severity: 'error',
        });
    }
    items.sort((a, b) => a.line - b.line);
    const errors = items.filter((item) => item.severity === 'error').length;
    return { items, errors, warnings: items.length - errors, post, images };
}
/** 1-based file line of a top-level frontmatter key, or 1 when it is not found. */
function frontmatterKeyLine(yaml, key) {
    const index = yaml.split(/\r?\n/).findIndex((line) => new RegExp(`^${key}[ \\t]*:`).test(line));
    return index === -1 ? 1 : index + 2; // +1 for the opening fence, +1 for 1-based lines
}
