# backend/ — package guidance (nested CLAUDE.md)

- Module codename: **Kestrel**.
- Every thrown error is an `AppError` whose `code` is prefixed `BK-` and registered in `src/errors.ts`.
- **Every exported error factory in `src/errors.ts` carries a JSDoc line `/** @kestrel <code> */`** — the
  error-catalog generator keys on that tag; a factory without it is invisible to the catalog.
- Handlers in `src/server.ts` must never `throw` raw `Error`.
