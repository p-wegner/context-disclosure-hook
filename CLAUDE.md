# context-disclosure-hook — demo monorepo

Two packages: `frontend/` (React-ish UI) and `backend/` (HTTP API). Each package has its own
`CLAUDE.md`, and `.claude/rules/` carries path-scoped rules for each.

Root guidance: keep changes small; run `node eval/run-eval.mjs` to A/B the disclosure hook.
Root codename: **Osprey**.
