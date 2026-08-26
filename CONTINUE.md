# CONTINUE.md — context-disclosure-hook

## What is true today (2026-08-26)

- Demo monorepo, hook (`.claude/hooks/disclose-context.mjs`), settings, and A/B eval runner exist and are committed.
- Hook unit-checked offline with synthetic PostToolUse payloads: injects once per session per file,
  follows `cd`, parses Grep filename lists and `file:line:` hits, silent for root-level files.
- Evidence base (agentic-kanban builder sessions, `session-inspector/scripts/read-patterns.mjs
  --project agentic-kanban --worktrees --days 90`): 237 Sonnet-5 sessions, 148 guided-subtree
  touches, 15 never injected — all 15 Grep/shell-only. Reproducible with that command.

## Eval — latest run

See `eval/out/report.md` after `node eval/run-eval.mjs`; the table from the run that shipped
this file is reproduced below 

Sonnet, 2 reps (`--reps 2`), 2026-08-26, commit eafde4e:

| prompt | arm | @kestrel tag (nested CLAUDE.md) | rule conventions | tools used | CC nested_memory | hook fired | turns | cost |
|---|---|---|---|---|---|---|---|---|
| bash | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | PowerShell×7 | false | false | 8 | $0.218 |
| bash | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | PowerShell×3 Edit×4 | false | false | 8 | $0.105 |
| bash | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | PowerShell×3 Edit×5 | false | true | 9 | $0.127 |
| bash | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | PowerShell×3 Edit×3 | false | true | 7 | $0.097 |
| free | control | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Read×3 Glob×1 Edit×5 | true | false | 10 | $0.210 |
| free | control | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Read×3 Edit×6 | true | false | 10 | $0.133 |
| free | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Read×3 Edit×3 | true | false | 7 | $0.097 |
| free | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Read×3 Edit×5 Glob×1 | true | false | 10 | $0.136 |
| grep | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | Grep×4 Edit×2 | false | false | 7 | $0.148 |
| grep | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | Grep×2 Edit×2 | false | false | 5 | $0.066 |
| grep | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Grep×5 Edit×4 Read×1 | true | true | 11 | $0.140 |
| grep | hook | missing ❌ | CHANGES.md ❌ no console.log ✅ | Grep×2 Edit×2 | false | true | 5 | $0.079 |

**Reading it:** control arms that never Read (bash, grep) miss BOTH conventions 4/4 — no `nested_memory`,
Edit alone injects nothing. Hook arms: delivered 4/4 (`hook fired`), followed 3/4 — the one miss
(grep/hook rep 2) had both files injected before its first Edit and ignored them (model compliance,
not disclosure). Free arms use Read → Claude Code's own injection works, both arms pass 4/4.
The cleanest proof is `bash/hook`: `nested_memory=false`, hook=true, both conventions followed — the
agent never used Read and still got the guidance.

## Verification of the hook itself

- `node eval/verify-transcripts.mjs [results.json]` — reads each run's transcript: every
  `hook_additional_context` attachment, the tool call that triggered it, the `<disclosed-context
  source>` files, per-file counts (dupes) and `hook_non_blocking_error`s. On the kept run: hook
  arms with Grep/shell touches fired 4/4, after the first Grep/PowerShell call touching
  `backend/`; free arms (Read only) correctly never fired; zero hook errors.
- `node eval/race-test.mjs [N]` — concurrency/dedup check, exit 1 unless exactly one injects.

## Known limits / not verified

- ~~Per-session dedup race~~ **fixed** (mkdir-as-lock around the state read-modify-write).
  Verified two ways: `node eval/verify-transcripts.mjs` over the 12 eval transcripts showed the
  race once (grep/hook rep1: `backend/CLAUDE.md` + rule injected twice, two Grep calls in one
  turn, hooks finished 63 ms apart — every other hook-arm run injected each file exactly once);
  `node eval/race-test.mjs 16` (16 concurrent invocations, one session) injects exactly 1 with
  the fix vs 5 of 8 with the pre-fix hook.
- Two earlier full runs (`eval/out-run1-brokenhookpath`, `eval/out-run2-brokenhookpath`, gitignored)
  had the hook failing on path resolution — `$CLAUDE_PROJECT_DIR` is empty in `claude -p` and Claude
  Code pre-expands it, so `${VAR:-.}` doesn't help; only a plain relative path works.

- Path extraction from shell commands is heuristic (tokens that exist on disk). Paths built at
  runtime (`for f in $(…)`), globs (`src/**/*.ts`) and paths only in stderr are missed.
- The eval ran with `--model sonnet`, 2 reps per cell; directional, not statistically robust.
- `~/.claude/rules` are matched too, but untested here (none exist on this machine).
- Whether Claude Code loads path-scoped rules on Edit/Write (not only Read) was not isolated.

## Next steps

1. `--reps 3`, and `--model opus` to see whether the gap widens with a more search-first model.
2. Ship the hook into the kanban board's worktree scaffold (`project-scaffold.ts`) so every builder
   gets it — file a board ticket against agentic-kanban first.
3. Consider a PreToolUse variant that injects *before* the shell command runs (guidance arrives
   before the agent acts on what it grepped).
