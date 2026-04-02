# Deferred Items - Phase 02

## Pre-existing Lint Errors (from Plan 01)

1. `src/lib/upload.ts:11` - `@typescript-eslint/no-explicit-any` on `ACCEPTED_MIME_TYPES.includes(file.type as any)`
2. `src/app/api/upload/route.ts:12` - `@typescript-eslint/no-unused-vars` on `pathname`
3. `src/app/api/upload/route.ts:24` - `@typescript-eslint/no-unused-vars` on `tokenPayload`

These cause `npm run build` to fail but are not introduced by Plan 02.
