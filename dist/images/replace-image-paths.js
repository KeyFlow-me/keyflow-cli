/**
 * Replace image paths inside `markdown` using `urlFor(raw)`.
 * Only the referenced spans change; every other byte is kept.
 */
export function replaceImagePaths(markdown, refs, urlFor) {
    let out = markdown;
    for (const ref of [...refs].sort((a, b) => b.start - a.start)) {
        const url = urlFor(ref.raw);
        if (!url)
            continue;
        // Angle-bracket targets may contain spaces; a URL never does, so the brackets can stay.
        out = out.slice(0, ref.start) + url + out.slice(ref.end);
    }
    return out;
}
