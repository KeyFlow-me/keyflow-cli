import fs from 'fs';
import path from 'path';
import type { AgentTarget } from './agent-targets.js';
import { upsertAgentBlock } from './upsert-agent-block.js';

/** Write the KeyFlow block into one agent file. Returns what happened to the file. */
export function writeAgentTarget(target: AgentTarget): 'created' | 'updated' | 'unchanged' {
  const existing = fs.existsSync(target.file) ? fs.readFileSync(target.file, 'utf8') : null;
  const next = upsertAgentBlock(existing, target.newFilePrefix);
  if (existing === next) return 'unchanged';
  fs.mkdirSync(path.dirname(target.file), { recursive: true });
  fs.writeFileSync(target.file, next);
  return existing === null ? 'created' : 'updated';
}
