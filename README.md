# context-disclosure-hook

A small monorepo that demonstrates — and closes — a gap in Claude Code's progressive disclosure
of project guidance.

## The gap

Claude Code loads guidance lazily and by path:

| Guidance | Loaded when |
|---|---|
| `./CLAUDE.md` (root, ancestors), `~/.claude/CLAUDE.md`, rules **without** `paths:` | at launch |
| `sub/dir/CLAUDE.md` (nested) | when the agent **reads a file** in that subtree |
| `.claude/rules/*.md` **with** `paths:` globs | when the agent **reads a matching file** |

"Reads" means the **Read** tool — in the eval below, sessions that only **Edit**ed files in
`backend/` got no `nested_memory` either. Newer models work search-first: they reach for
the built-in **Grep**/**Glob** tools and for shell readers — `cat`, `sed -n 1,80p`, `grep -n`,
`rg`, `head`, `Get-Content` — because those are cheaper than a whole-file Read. Those touch the
very same files and trigger **nothing**, so `backend/CLAUDE.md` and the `backend/**` rule never
reach an agent that only ever `grep`s and `cat`s inside `backend/`.

Evidence from 237 real builder sessions on the agentic-kanban board (Sonnet 5, last 90 days,
measured with `session-inspector/scripts/read-patterns.mjs`):

- 33 % of Read calls were partial (`offset`/`limit`); Grep+Glob+shell reads ran at 0.65× the Read count.
- Of 148 (session × guided-subtree) touches, **15 (10 %) never received that subtree's `CLAUDE.md`
  — every one of them was a Grep/shell-only touch; 0 of 15 were injected**.
- Where a Read did follow an indirect first touch, the median lag was 1 tool call, but p90 = 9
  and max = 16 calls of working inside a subtree before its guidance arrived.

## The fix — one PostToolUse hook

`.claude/hooks/disclose-context.mjs` (zero dependencies) runs after `Bash|PowerShell|Grep|Glob`:

1. Extracts every path the call touched — from the command line (with `cd` tracking) **and** from
   the tool's output (Grep filename lists, `file:line:` hits, `ls`/`find` output).
2. For each path, resolves the nested `CLAUDE.md`/`CLAUDE.local.md` files between the project root
   and that path, and every `.claude/rules/*.md` (project and `~/.claude/rules`) whose frontmatter
   `paths:` globs match it.
3. Injects the ones this session has not seen yet as `hookSpecificOutput.additionalContext` —
   the same content the agent would have received from a Read — once per session per file
   (state under `%TEMP%/claude-disclose-context/<session_id>.json`, guarded by a mkdir lock —
   the hooks of parallel tool calls in one turn run concurrently).

```json
{ "hooks": { "PostToolUse": [ { "matcher": "Bash|PowerShell|Grep|Glob", "hooks": [
  { "type": "command", "command": "node .claude/hooks/disclose-context.mjs", "timeout": 10 } ] } ] } }
```

> Why a bare relative path: hooks run with cwd = project root, and `$CLAUDE_PROJECT_DIR` is **empty in
> `claude -p` sessions** (CC 2.1.246). Claude Code substitutes the variable textually before the shell
> runs, so even `${CLAUDE_PROJECT_DIR:-.}` expands to nothing and node looks for `C:\.claude\hooks\…`.
> Two eval runs were lost to exactly that; the transcripts show it as `hook_non_blocking_error`.

Knobs: `DISCLOSE_LOG=1` (stderr trace), `DISCLOSE_DISABLED=1` (no-op, the eval's control arm),
`DISCLOSE_ALL_TOOLS=1` (also handle Read/Edit/Write), `DISCLOSE_STATE_DIR`.

## Layout

```
CLAUDE.md                     root guidance (always loaded)
backend/CLAUDE.md             nested: "@kestrel" JSDoc tag on every error factory  ← not inferable from code
.claude/rules/backend.md      paths: backend/**  → "every backend change adds a line to backend/CHANGES.md"
frontend/CLAUDE.md, .claude/rules/frontend.md   the same pattern for frontend/
.claude/rules/general.md      no paths → loaded at launch
.claude/hooks/disclose-context.mjs, .claude/settings.json
eval/run-eval.mjs             the A/B eval
eval/verify-transcripts.mjs   proves from transcripts: hook fired, after which tool, each file once
eval/race-test.mjs            N concurrent invocations → exactly 1 injection (dedup lock)
```

## Eval

```
node eval/run-eval.mjs [--model sonnet] [--reps 1] [--prompts bash,grep,free]
```

Each run is one `claude -p` session given a **task** (add a `forbidden()` error factory and wire a
403) that never mentions CLAUDE.md or rules. Two conventions decide the score and are *not*
inferable from the code: the `@kestrel` tag (nested `CLAUDE.md`) and the `CHANGES.md` line
(path-scoped rule). Arms: **control** (`DISCLOSE_DISABLED=1`, identical settings) vs **hook**.
Prompts force a read style (`bash`: shell only; `grep`: Grep tool for orientation, Edit to
change) or leave it free. Everything in the report is read back from the session transcript —
which tools ran, whether Claude Code's own `nested_memory` attachment appeared, whether the hook
fired — and from `git diff`, then `backend/`+`frontend/` are reset for the next run.

Results: `eval/out/report.md` per run; kept runs under `eval/results/` (latest also in [CONTINUE.md](CONTINUE.md)).
