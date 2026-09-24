import { loadGuide } from '../guide/load-guide.js';

/** `keyflow guide`: print the agent guide. Notes go to stderr so stdout stays pure Markdown. */
export async function guideCommand() {
  const result = await loadGuide();
  if (result.source !== 'server') {
    const cached = `cached guide${result.version ? ` (version ${result.version})` : ''}`;
    const label = result.source === 'cache' ? cached : 'bundled offline guide';
    console.error(`Note: could not fetch the latest guide (${result.reason}). Showing the ${label}.`);
  }
  process.stdout.write(result.markdown.endsWith('\n') ? result.markdown : `${result.markdown}\n`);
}
