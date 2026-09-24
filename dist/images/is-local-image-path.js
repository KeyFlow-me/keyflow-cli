/** True when a markdown image target points at a local file (not a URL). */
export function isLocalImagePath(target) {
    if (!target)
        return false;
    if (target.startsWith('//') || target.startsWith('#'))
        return false;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target))
        return false;
    return true;
}
