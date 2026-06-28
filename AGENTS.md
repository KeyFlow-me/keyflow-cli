<!-- BEGIN MANAGED AGENTPLAYBOOK ROUTING -->
## AgentPlaybook Active Routing

This managed block is the active shared AgentPlaybook workflow link for this
repository. Keep repo-local instructions in this file as the source of truth for
project paths, commands, domain rules, and product policy. If another
AgentPlaybook section appears elsewhere, this managed block wins for shared
workflow routing while repo-specific rules still win for local facts.

Use the existing shared AgentPlaybook root. In committed repo-local files, keep
the reference portable: set `AGENTPLAYBOOK_HOME` in the local shell/runtime, or
use a repo-pinned `.agents/AgentPlaybook` only when this repo intentionally owns
one. Do not clone, vendor, download, or commit a second AgentPlaybook root unless
the user explicitly approves after seeing the existing root path.

Shared entrypoints:

```text
${AGENTPLAYBOOK_HOME}/AGENTS.md
${AGENTPLAYBOOK_HOME}/index.md
${AGENTPLAYBOOK_HOME}/scripts/agent-entry.py
${AGENTPLAYBOOK_HOME}/scripts/project-discover.py
${AGENTPLAYBOOK_HOME}/scripts/agent-hook.py
${AGENTPLAYBOOK_HOME}/scripts/workflow.py
${AGENTPLAYBOOK_HOME}/scripts/agent-preflight.py
${AGENTPLAYBOOK_HOME}/scripts/agent-finish-check.py
```

Before project work, read repo-local guidance first, then use AgentPlaybook only
to select the smallest relevant shared cards. Keep shared workflow and skill
guidance in AgentPlaybook; do not create repo-local skill documents merely to
mirror shared behavior. Keep repo-local skills, workflows, wiki pages, or
runbooks only when they contain product-specific facts, commands, domain policy,
or verification that cannot be shared safely.

For every multi-step task, run the start hook before selecting shared docs,
editing, reviewing, committing, or reporting completion. When executing wrapper
commands from an agent runtime, resolve `AGENTPLAYBOOK_HOME` to an absolute path
first and use that absolute script path in the command. Do not leave `$HOME`,
`${HOME}`, `~`, `$(pwd)`-based script paths, or relative AgentPlaybook paths in
commands that may be persisted as permission rules.

```bash
python3 /absolute/path/to/AgentPlaybook/scripts/agent-hook.py start --project "$(pwd)" --rules /absolute/path/to/AgentPlaybook --command <command> --request "<USER_REQUEST>"
```

Use the returned route manifest as the task checklist. If the route includes
`route docs read`, run the docs-read hook before triage, ambiguity handling,
implementation, review, or edits. Run the review hook after the scoped diff is
ready, and run the finish hook before final report, commit, release, or handoff.
Pass evidence for every required route gate. Missing route, preflight, docs-read,
review, finish, or gate evidence is non-compliant even when the final files look
correct.

Request intake is mandatory for requirement analysis and modifications, even
when the task does not create a PRD. `--request-classified` must include
`--classification-evidence`. Before editing, present a short alignment
checkpoint to the user when assumptions affect behavior, scope, safety, cost,
data, or external state: what is clear, what may differ, what is unknown, and the
exact question or assumption that unblocks work.

For feature, product, build, bugfix, refactor, simplification, workflow setup,
release, shipping, or general task implementation, search and open PRD, spec,
ARD, issue, design note, task doc, or source-of-truth docs before code or edits.
If none exists, record that result and whether the current user request is enough
for the slice.

Before implementation, record the `documentation impact` decision: affected doc
path or doc class, intended decision (`updated`, `created`, `unchanged`, or `not
applicable`), and why behavior, workflow policy, public contract, operator
action, or acceptance criteria do or do not require a documentation update. The
later `documentation` gate must prove the actual update or unchanged/not
applicable decision.

If the route, repo workflow, or user asks for Grill-Me, use the actual Grill-Me
protocol, skill, or `/grilling` session as the question drill. Do not replace it
with ad hoc internal questions. Record the Grill-Me output in finish evidence
when required.

For code work, decide whether to use subagents only after the target project,
owned files, boundaries, forbidden files, and verification commands are clear.
Use subagents for separable research, review, or implementation streams; keep
small single-boundary changes in the main agent. Record the split decision in
the route gates when requested.

If a required gate or hook fails, do not finalize. Return to the first missed
gate only and retry that same scope once. If it fails again, run the shared
retrospective-learning workflow and record the durable lesson before handoff or
another attempt.

VibeGuard is required before documentation, code, configuration, dependency,
data, deployment, or credential changes and again before finishing. Run it with
the selected AgentPlaybook root as the rule source. Do not run VibeGuard `setup`
or `update` blindly; preserve existing guardrails unless the user explicitly
chooses a refresh/setup mode. Human-visible gate status must use only
`🐱🟢 SUCCESS` or `🐱🔴 FAIL`.
<!-- END MANAGED AGENTPLAYBOOK ROUTING -->
# Agent Instructions

Use repo-local instructions first. This repo uses the shared AgentPlaybook
checkout for reusable workflow, safety, review, and platform guidance.

## Documentation Language Rule

- KeyFlow CLI documentation, README updates, PRDs, specs, and agent notes must be written in English.
- Keep code identifiers, paths, commands, API names, environment variables, package names, and external proper nouns literal.
- Sibling repository rules differ: `../KeyFlow` Web docs are Korean-only, and `../keyflow-desktop` docs are Korean-only.
- Cross-repo documentation structure and the README/AGENTS roles are tracked in `../KeyFlow/specifications/documentation_structure.md`.
