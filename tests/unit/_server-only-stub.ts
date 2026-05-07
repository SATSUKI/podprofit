/**
 * Vitest stub for the Next.js `server-only` module.
 *
 * Production builds throw if `server-only` is imported from a Client Component;
 * vitest doesn't run that guard, so we alias the module to this empty file via
 * `vitest.config.ts`. Keep this file empty — its only job is to be importable.
 */
export {};
