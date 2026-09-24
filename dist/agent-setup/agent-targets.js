import fs from 'fs';
import path from 'path';
const SKILL_FRONTMATTER = `---
name: keyflow
description: Post, upload, or publish Markdown to KeyFlow (키플로우) with the keyflow CLI. Use when the user asks to put something on KeyFlow.
---
`;
/**
 * The single table of supported agents. Add a row here when a new agent appears.
 * Paths follow each tool's documentation for user-level instructions:
 * - Codex: `$CODEX_HOME/AGENTS.md` (default `~/.codex`), or `AGENTS.override.md` when it exists.
 * - Antigravity (AGY): `~/.gemini/AGENTS.md` (global cross-tool rules).
 * - Gemini CLI: `~/.gemini/GEMINI.md`.
 * - Claude Code: a user skill at `~/.claude/skills/keyflow/SKILL.md`.
 * - Cursor and other AGENTS.md tools: the repository `AGENTS.md` (Cursor global rules live in its settings UI).
 */
export function agentTargets(env) {
    const exists = (p) => fs.existsSync(p);
    const codexHome = env.codexHome || path.join(env.home, '.codex');
    const codexOverride = path.join(codexHome, 'AGENTS.override.md');
    const gemini = path.join(env.home, '.gemini');
    return [
        {
            id: 'codex',
            name: 'Codex',
            file: exists(codexOverride) ? codexOverride : path.join(codexHome, 'AGENTS.md'),
            scope: 'global',
            detected: exists(codexHome),
        },
        {
            id: 'antigravity',
            name: 'Antigravity (AGY)',
            file: path.join(gemini, 'AGENTS.md'),
            scope: 'global',
            detected: exists(path.join(gemini, 'antigravity')) || exists(path.join(env.home, '.antigravity')),
        },
        {
            id: 'gemini',
            name: 'Gemini CLI',
            file: path.join(gemini, 'GEMINI.md'),
            scope: 'global',
            detected: exists(gemini),
        },
        {
            id: 'claude',
            name: 'Claude Code',
            file: path.join(env.home, '.claude', 'skills', 'keyflow', 'SKILL.md'),
            scope: 'global',
            detected: exists(path.join(env.home, '.claude')),
            newFilePrefix: SKILL_FRONTMATTER,
        },
        {
            id: 'project',
            name: 'This repository AGENTS.md (Cursor, Codex, AGY and other AGENTS.md tools)',
            file: path.join(env.cwd, 'AGENTS.md'),
            scope: 'project',
            detected: false,
        },
    ];
}
