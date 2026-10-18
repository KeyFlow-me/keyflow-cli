import fs from 'fs';
import path from 'path';
import { upsertAgentBlock } from './upsert-agent-block.js';
/** Write the KeyFlow block into one agent file. Returns what happened to the file. */
export function writeAgentTarget(target) {
    // A linked file inside a project someone else wrote could point anywhere, such as a shell profile.
    // Global files under the home folder stay writable through links because dotfile setups link them on purpose.
    if (target.scope === 'project' && isSymbolicLink(target.file))
        throw new Error(`Refusing to write through a symbolic link: ${target.file}`);
    const existing = fs.existsSync(target.file) ? fs.readFileSync(target.file, 'utf8') : null;
    const next = upsertAgentBlock(existing, target.newFilePrefix);
    if (existing === next)
        return 'unchanged';
    fs.mkdirSync(path.dirname(target.file), { recursive: true });
    fs.writeFileSync(target.file, next);
    return existing === null ? 'created' : 'updated';
}
function isSymbolicLink(file) {
    try {
        return fs.lstatSync(file).isSymbolicLink();
    }
    catch {
        return false;
    }
}
