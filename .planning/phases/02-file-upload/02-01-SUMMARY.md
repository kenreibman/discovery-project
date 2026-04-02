---
phase: 02-file-upload
plan: 01
subsystem: api
tags: [vercel-blob, anthropic-sdk, unpdf, vitest, server-actions, drizzle-relations]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: auth (auth.ts), database schema (cases/documents tables), db connection
provides:
  - Upload API route with auth gating and PDF/size enforcement
  - Case CRUD server actions (createCase, renameCase, deleteCase, getCases, getCase)
  - Document CRUD server actions (addDocument, removeDocument, updateDocumentType)
  - AI document classification via Claude Haiku (classifyDocument)
  - Upload validation utilities (validateFile, MAX_FILE_SIZE, formatFileSize)
  - Vitest test stubs for upload, upload-security, and cases
  - shadcn UI components (badge, select, progress, alert-dialog, dropdown-menu, sonner)
affects: [02-file-upload, 03-pdf-parsing, 04-rfp-generation]

# Tech tracking
tech-stack:
  added: ["@vercel/blob", "@anthropic-ai/sdk", "unpdf", "@testing-library/react", "@testing-library/jest-dom", "jsdom"]
  patterns: ["Server actions with auth gating pattern", "Vercel Blob client-side upload via handleUpload", "Claude Haiku for lightweight classification with graceful fallback", "Drizzle relations for query API"]

key-files:
  created:
    - src/app/api/upload/route.ts
    - src/actions/cases.ts
    - src/actions/documents.ts
    - src/actions/classify.ts
    - src/lib/upload.ts
    - src/__tests__/upload.test.ts
    - src/__tests__/upload-security.test.ts
    - src/__tests__/cases.test.ts
  modified:
    - package.json
    - src/lib/db/schema.ts
    - src/app/layout.tsx
    - src/components/ui/button.tsx

key-decisions:
  - "Vitest already installed from Phase 1; reused existing config with @ path alias"
  - "Card component already existed from Phase 1; skipped reinstall"
  - "Drizzle relations added to schema.ts to enable db.query.* API for findFirst/findMany"

patterns-established:
  - "Server action auth pattern: const session = await auth(); if (!session?.user?.id) throw new Error('Not authenticated')"
  - "Blob cleanup pattern: fetch document URLs before deleting case/document, then call del()"
  - "AI classification with fallback: try Claude Haiku, catch returns default type with low confidence"

requirements-completed: [UPLD-01, UPLD-02, UPLD-06]

# Metrics
duration: 3min
completed: 2026-04-02
---

# Phase 02 Plan 01: Upload Backend Summary

**Vercel Blob upload route with auth/PDF/size enforcement, case and document CRUD server actions, Claude Haiku document classification, and vitest test infrastructure**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-02T02:34:17Z
- **Completed:** 2026-04-02T02:37:31Z
- **Tasks:** 2
- **Files modified:** 19

## Accomplishments
- Upload API route at /api/upload with authentication gating, PDF-only content type enforcement, and 20MB size limit via Vercel Blob handleUpload
- Five case server actions (createCase, renameCase, deleteCase, getCases, getCase) and three document server actions (addDocument, removeDocument, updateDocumentType) with blob cleanup on deletion
- AI document classification using Claude Haiku with text extraction via unpdf and graceful fallback for scanned PDFs or API errors
- Upload validation utilities (validateFile, formatFileSize, MAX_FILE_SIZE) with full test coverage
- Wave 0 test stubs for upload, upload-security, and case CRUD modules -- all 21 tests passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, create vitest config, and Wave 0 test stubs** - `3fcafbb` (feat)
2. **Task 2: Create upload API route and server actions** - `7a537d8` (feat)

## Files Created/Modified
- `src/app/api/upload/route.ts` - Vercel Blob handleUpload endpoint with auth, PDF-only, 20MB limit
- `src/actions/cases.ts` - Case CRUD server actions with auth and blob cleanup
- `src/actions/documents.ts` - Document CRUD server actions with auth and blob cleanup
- `src/actions/classify.ts` - Claude Haiku document classification with unpdf text extraction
- `src/lib/upload.ts` - Upload validation utilities (validateFile, MAX_FILE_SIZE, formatFileSize)
- `src/__tests__/upload.test.ts` - Tests for upload validation (6 tests)
- `src/__tests__/upload-security.test.ts` - Test stubs for upload security (3 stubs)
- `src/__tests__/cases.test.ts` - Test stubs for case CRUD (3 stubs)
- `src/lib/db/schema.ts` - Added Drizzle relations (casesRelations, documentsRelations)
- `src/app/layout.tsx` - Added Toaster component for toast notifications
- `src/components/ui/alert-dialog.tsx` - New shadcn component
- `src/components/ui/badge.tsx` - New shadcn component
- `src/components/ui/dropdown-menu.tsx` - New shadcn component
- `src/components/ui/progress.tsx` - New shadcn component
- `src/components/ui/select.tsx` - New shadcn component
- `src/components/ui/sonner.tsx` - New shadcn component
- `package.json` - Added production and dev dependencies

## Decisions Made
- Reused existing vitest config from Phase 1 (already had @ path alias and vitest installed) rather than creating new one as plan specified
- Card component already present from Phase 1, skipped duplicate installation
- Added Drizzle relations to schema.ts to support db.query API used by server actions

## Deviations from Plan

None - plan executed exactly as written. Minor adaptations: vitest and card were already present from Phase 1, so those installation steps were effectively no-ops.

## Issues Encountered
None

## User Setup Required

**External services require manual configuration.** The plan's `user_setup` section specifies:
- `BLOB_READ_WRITE_TOKEN` - Vercel Dashboard -> Storage -> Create Blob Store -> copy token to .env.local
- `ANTHROPIC_API_KEY` - console.anthropic.com -> API Keys -> create key -> copy to .env.local

These are needed at runtime for upload and classification functionality.

## Next Phase Readiness
- Upload backend complete, ready for upload UI (Plan 02) and case management pages (Plan 03)
- Server actions provide the full data layer the frontend will consume
- Classification action ready to be called after each upload in the UI flow

## Self-Check: PASSED

- All 14 created files verified present on disk
- Commit 3fcafbb (Task 1) verified in git log
- Commit 7a537d8 (Task 2) verified in git log
- TypeScript compilation: clean (0 errors)
- Vitest: 21/21 tests passing (7 test files)

---
*Phase: 02-file-upload*
*Completed: 2026-04-02*
