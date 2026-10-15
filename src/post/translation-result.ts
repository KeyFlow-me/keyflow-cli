/** Result of resolving `translation_of`: the other language's post id, or a check problem. */
export type TranslationResult =
  | { ok: true; postId: string }
  | { ok: false; code: string; message: string; hint: string };
