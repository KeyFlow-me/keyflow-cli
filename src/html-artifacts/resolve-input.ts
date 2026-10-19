import { KeyflowError } from '../keyflow-api/keyflow-error.js';
import type { HtmlArtifactContracts as Contract } from './contracts.js';

/** Resolve explicit flags and retained owner metadata into one versioned save. */
export function resolveHtmlInput(html: string, options: Contract['Options'], previous?: Contract['Summary']): Contract['Input'] {
  if (options.publish && options.draft) invalid('conflicting-status', 'Use either --publish or --draft.');
  if (options.id !== undefined && !segment(options.id)) invalid('invalid-id', 'Use a valid HTML artifact ID.');
  if (options.as !== undefined && options.as !== 'post' && options.as !== 'link') invalid('invalid-publication', '--as must be post or link.');
  if (options.language !== undefined && options.language !== 'ko' && options.language !== 'en') invalid('invalid-language', '--language must be ko or en.');
  if (options.folder !== undefined && !segment(options.folder)) invalid('invalid-folder', 'Use a valid folder ID.');
  if (options.id && options.folder !== undefined) invalid('folder-update-forbidden', '--folder is available only when creating HTML.');
  if (options.as === 'link' && options.folder !== undefined) invalid('folder-link-forbidden', '--folder is available only for native posts.');
  const title = options.title?.trim() ?? previous?.title;
  if ((!options.id || previous || options.title !== undefined) && (!title || title.length > 120)) {
    invalid('invalid-title', 'Supply --title with 1 to 120 characters for new HTML.');
  }
  const description = options.description ?? previous?.description ?? '';
  if (description.length > 500) invalid('invalid-description', 'Description must be no longer than 500 characters.');
  const publication = options.as ?? previous?.publication ?? 'post';
  if (previous && publication !== (previous.publication ?? 'post')) invalid('publication-change-forbidden', '--as cannot change an existing artifact type.');
  const language = options.language ?? previous?.language;
  return {
    title: title ?? '', description, html,
    status: options.publish ? 'published' : options.draft ? 'draft' : previous?.status ?? 'draft',
    publication: publication as 'post' | 'link',
    ...(language ? { language: language as 'ko' | 'en' } : {}),
    ...(options.folder !== undefined ? { folderId: options.folder } : {}),
    ...(options.id ? { artifactId: options.id, ...(previous ? { expectedVersion: previous.version } : {}) } : {}),
  };
}

function segment(value: string) { return /^[a-zA-Z0-9_-]{1,128}$/.test(value); }
function invalid(code: string, message: string): never { throw new KeyflowError(message, 400, code); }
