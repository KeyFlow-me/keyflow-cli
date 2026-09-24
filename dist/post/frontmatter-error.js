/** Invalid YAML frontmatter, with the 1-based file line where it was detected. */
export class FrontmatterError extends Error {
    line;
    constructor(message, line) {
        super(message);
        this.line = line;
    }
}
