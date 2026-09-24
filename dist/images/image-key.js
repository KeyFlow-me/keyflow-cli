/** Lookup key for an uploaded image URL: the same file can be used as content and as cover. */
export function imageKey(usage, absolutePath) {
    return `${usage}:${absolutePath}`;
}
