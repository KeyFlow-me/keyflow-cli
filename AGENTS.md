<!-- BEGIN MANAGED TAO AGENT OS ROUTING -->
## Tao Agent OS Active Routing

This managed block is generated from `templates/repo-agents-routing.md` in the
shared Tao Agent OS. Everything outside this block is repo-owned.

Shared Tao Agent OS library:

```text
${TAO_HOME}/AGENTS.md
${TAO_HOME}/index.md
${TAO_HOME}/scripts/agent-entry.py
${TAO_HOME}/scripts/project-discover.py
<TAO_LAUNCHER>
```

Use repo-local instructions first. If this block is being installed into a
personal or global runtime instructions file, and the runtime starts outside the
target repo or the request does not name one clear repo, run
`agent-entry.py` or `project-discover.py` first and stop when it returns
`ambiguous` or `not_found`. If `agent-entry.py` returns `selected`, prefer
starting or relaunching the runtime with that selected repo as the primary
workspace. For Codex, use `codex -C <TARGET_REPO>`; add
`--add-dir ${TAO_HOME}` only when the task needs the shared
Tao Agent OS root in the session workspace. Repo instruction files define
behavior; runtime launch options define filesystem scope. Explicitly read the
current target project's
instruction file for this runtime before using Tao Agent OS: Codex-style
agents read `AGENTS.md`, Claude reads `CLAUDE.md` when
present, Codex-specific setups read `CODEX.md` when present,
Gemini/Antigravity/AGY reads `AGENTS.md`, and generic agents read their
configured project instruction document or `.agents/README.md` when used.
If the request names a product/workspace alias that may map to multiple repos,
use the local `~/.tao/projects.json` workspace group when available.
Do not guess a single repo from the alias alone. If work starts in one primary
repo and investigation shows a secondary repo must be written, stop before that
write and record a workspace scope checkpoint: starting primary, secondary or
source-of-truth repo, selected mode (`primary-led secondary read`,
`primary-led secondary write`, or `multi-session`), write scope, session model,
and cross-repo verification. When finish-check evidence is used and a secondary
repo was written, pass it as `workspace scope checkpoint=<evidence>`,
`scope expansion checkpoint=<evidence>`, or
`cross-repo scope checkpoint=<evidence>`.
Use the workflow router for narrow selection. Do not read `index.md` after
successful routing; it is a fallback catalog, not another startup requirement.
Do not create repo-local skill documents merely to copy shared Tao Agent OS
behavior. Keep repo-local skills, workflows, wiki pages, or runbooks only when
they contain product-specific facts, commands, domain policy, or verification
that cannot be shared safely.
VibeGuard is required before documentation, code, config, dependency, data,
deployment, or credential changes. In a tracked lifecycle the start and review
hooks run it with ${TAO_HOME} as the rule source and report `VibeGuard overall`;
read that line instead of repeating the audit, and run the package command
yourself only when a hook reports `Skipped`, when no tracked lifecycle is in
use, or as `--strict` before push or publish.
The VibeGuard site is a human reference and does not need to
be fetched by the agent. Do not run VibeGuard `setup` or `update` blindly. If
this repo already has custom agent instructions,
`.vibeguard.json`, `VIBEGUARD.md`, or a managed VibeGuard block, ask a short
application drill first: add pointer vs merge vs pin; audit-only vs refresh
with update vs first-time setup; apply now vs prepare instructions only.
Default to preserving current guardrails and running audit only unless the user
chooses to refresh the managed block.
Read-only lookup, explanation, status, and checks of a supplied diagnosis use
bounded direct evidence without start, fingerprint, mailbox, checkpoint, gate,
review, or finish calls. Applicable project instructions and source contracts
still apply. Checking a diagnosis is not a diff review merely because the user
says "verify". Explicit change/PR reviews and release acceptance retain their
review workflow. Enter the writable lifecycle before any authorized edit.
The lifecycle and gate requirements below apply only to tracked work, not these
read-only answers. When updating an installed routing block, replace its older
blanket multi-step requirements and check local adapters for contradictions;
preserve product-specific contracts, safety rules and metering integration.
For tracked multi-step tasks, run `<TAO_LAUNCHER> start` once with `--request
"<USER_REQUEST>"`; it runs workflow routing/preflight and reports the required
hooks for the route. Do not separately repeat workflow list, classify, route, or
preflight. Use the start output as the command manifest before selecting task
documents, editing, reviewing, committing, or reporting completion. If the
current user message is a direct question, answer it before routing or editing.
Do not wait for the user to name document keywords. Let routing/search infer
the work surface from the request, platform, concern, and touched files; use
`workflow-doc-surfaces.json` and the local document graph as inputs; read the
route's `required_docs` before editing or reviewing; and treat graph neighbors as
`reference_docs` unless the route promotes them to `required_docs`. If
routing/search misses a clearly relevant platform, concern, or document
surface, stop and report the gap instead of proceeding from memory. Reading the
selected `required_docs` is a direct agent responsibility; do not add a second
document-confirmation step.
After the start hook and required-doc reading, consume
`parallel_execution.delegation_policy`. When the runtime exposes workers and
the multi-agent collaboration skill identifies at least two meaningful slices
with disjoint scopes, a stable contract, an integration owner, and focused
verification, delegate automatically without waiting for explicit user
multi-agent wording. Use Codex native workers, Claude Agent/Task workers, or
the Gemini/AGY Antigravity agent runner according to the active runtime.
Otherwise record the concrete serial reason. At each parent-to-worker boundary,
run `<TAO_LAUNCHER> handoff`; it refreshes the provider-neutral, content-free
execution capsule and validates it once. A ready and valid handoff lets the
worker reuse the parent's route, preflight, and required-doc manifest and skip
duplicate startup. An invalid handoff is a successful fallback decision that
requires the worker's normal lifecycle; never reuse mismatched capsule state.
The parent is the sole gate-ledger owner. Workers use worker-specific evidence
paths, return scoped evidence, and never overwrite the parent ledger, including
after an invalid handoff fallback. For a Codex leaf, use `dispatch --execute`
only when isolation is explicitly required. A matching parent profile or
unavailable parent profile information both stay in the current process or use
a native worker; neither condition starts a fresh Codex process.
If the direct question asks how to start app, product, or feature work, answer
with the PRD -> ARD -> implementation path before lower-level coding steps. If
the work then proceeds into code, use the `product` route unless an existing
PRD/ARD or repo-local instruction makes the slice clearly trivial.
Documentation enforcement for the active tracked route is owned centrally by
the shared Tao Agent OS finish-check across all runtimes; this pointer does not
add a documentation gate or approval round to read-only answers.
Do not duplicate or restate these rules in repo-local files; keep only this
pointer. The source of truth and the exception process are
`${TAO_HOME}/workflows/skills/documentation-update/SKILL.md`; add
exceptions there rather than self-judging. Load that card when the active route
requires it or an unresolved documentation decision needs its contract.
If the workflow router or start hook cannot run, stop and report the blocker
before continuing. Keep its gate execution ledger current; each required gate
must have evidence before completion. Show a short gate signal after each
completed or failed gate or task step. Completion requires every required gate
to be 🐱🟢 SUCCESS. Use only two cat signal badges in human-visible reports:
🐱🟢 SUCCESS means executed with evidence, and 🐱🔴 FAIL means blocked, failed,
missed, or missing evidence and triggers missed-gate recovery: stop
finalization, preserve the first failed checkpoint, roll back only dependent
agent-made changes when safe, and run the retrospective workflow. Improve and
verify the owning Tao Agent OS doc, hook, validator, or test before resuming
that checkpoint. One repair cycle is allowed; stop on the same failure or an
unsafe or ambiguous repair. Do not report any third gate state.
When the wrapper scripts are available, keep the existing start evidence,
run `<TAO_LAUNCHER> review` after the scoped diff is ready, and run
`<TAO_LAUNCHER> finish` before final report, commit, release, or handoff. Pass
evidence for every route gate to the finish check. The wrappers write local
evidence under
`.tao/`; this directory is runtime evidence and should usually be
gitignored. When executing wrapper commands from an agent runtime, resolve
`${TAO_HOME}` to an absolute path first; do not leave `$HOME`,
`${HOME}`, `~`, or a relative path in the executable command. Missing wrapper
evidence or missing route gate evidence is
non-compliant even when the final files look correct. VibeGuard `Needs review`
must be reported explicitly and can pass the finish check only with an
`--allow-vibeguard-review` reason. `--request-classified` must include
`--classification-evidence` and is honored only for a delegated worker backed by
a ready and valid parent execution capsule; every other caller passes
`--request "<USER_REQUEST>"` and lets the classifier run. Work routes require
resolved-scope evidence such
as `clear-scoped`, `answered ... separate actionable`, or `blockers resolved`,
not weak markers such as `classified`, `done`, `clarified`, or `no blockers`.
If a request asks for Grill-Me or classification returns `grill_me: true`,
missing Grill-Me protocol or `/grilling` session evidence is 🐱🔴 FAIL and
requires missed-gate recovery.
Do not load every shared document by default.
Replace `${TAO_HOME}` with a portable root reference. In committed
repo-local instructions, use `${TAO_HOME}` for shared local installs
or a repo-relative pinned path such as `.agents/tao-agent-os`; do not commit a
personal absolute path such as `/Users/.../tao-agent-os`. Full local paths
belong only in shell environment setup, one-shot prompts, or uncommitted
user-level runtime bridges. Use legacy `${KEYFLOW_AGENT_ROOT}` only when the
environment already provides it.
Keep repo paths, commands, components, role matrices, and domain terms in this repo.
<!-- END MANAGED TAO AGENT OS ROUTING -->
# Agent Instructions

Use repo-local instructions first. This repo uses the shared Tao Agent OS
checkout for reusable workflow, safety, review, and platform guidance.

## Documentation Language Rule

- KeyFlow CLI documentation, README updates, PRDs, specs, and agent notes must be written in English.
- Keep code identifiers, paths, commands, API names, environment variables, package names, and external proper nouns literal.
- Sibling repository rules differ: `../KeyFlow` Web docs are Korean-only, and `../keyflow-desktop` docs are Korean-only.
- Cross-repo documentation structure and the README/AGENTS roles are tracked in `../KeyFlow/specifications/documentation_structure.md`.
