/** A local image found in a markdown file, before hashing. */
export type LocalImage = {
  raw: string;
  absolutePath: string;
  /** Folder of the markdown file; only files really inside it may be uploaded. */
  root: string;
  usage: 'content' | 'cover';
  line: number;
};
