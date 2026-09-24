/** Invalid YAML frontmatter, with the 1-based file line where it was detected. */
export class FrontmatterError extends Error {
  readonly line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
  }
}
