---
paths:
  - "backend/**"
---
# Backend rules (path-scoped)

- Canary token for this rule: `BACKEND-RULE-7741`.
- Never `console.log` in the backend — use `log.info`/`log.error` from `src/log.ts`.
- **Every change under `backend/` adds one line to `backend/CHANGES.md`** (format: `- <what> (<file>)`), newest first.
