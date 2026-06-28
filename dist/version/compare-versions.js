function parseVersionPart(part) {
    const value = Number.parseInt(part, 10);
    return Number.isFinite(value) ? value : 0;
}
export function compareVersions(left, right) {
    const leftParts = left.split('.').map(parseVersionPart);
    const rightParts = right.split('.').map(parseVersionPart);
    const length = Math.max(leftParts.length, rightParts.length);
    for (let index = 0; index < length; index += 1) {
        const leftPart = leftParts[index] || 0;
        const rightPart = rightParts[index] || 0;
        if (leftPart > rightPart)
            return 1;
        if (leftPart < rightPart)
            return -1;
    }
    return 0;
}
