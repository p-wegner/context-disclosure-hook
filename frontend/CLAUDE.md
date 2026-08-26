# frontend/ — package guidance (nested CLAUDE.md)

- Module codename: **Heron**.
- Components live in `src/components/`, one component per file, named export only.
- Never import from `backend/` directly — go through `src/api.ts`.
