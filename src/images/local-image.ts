/** A local image found in a markdown file, before hashing. */
export type LocalImage = {
  raw: string;
  absolutePath: string;
  usage: 'content' | 'cover';
  line: number;
};
