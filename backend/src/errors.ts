export class AppError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
export const notFound = (what: string) => new AppError("BK-404", `${what} not found`);
export const invalid = (field: string) => new AppError("BK-422", `invalid ${field}`);
export function isAppError(e: unknown): e is AppError { return e instanceof AppError; }
