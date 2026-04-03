---
phase: 03-pdf-parsing-request-extraction
plan: 01
subsystem: api
tags: [claude-api, pdf-extraction, structured-output, zod, drizzle, server-actions]

# Dependency graph
requires:
  - phase: 02-file-upload
    provides: documents table, Vercel Blob storage, cases table with nullable name
provides:
  - extractRequests server action for PDF-to-structured-data pipeline
  - extractedRequests database table for per-document request storage
  - updateDocumentSubType server action for manual sub-type override
  - Zod + JSON schema for Claude structured output validation
  - EXTRACTION_PROMPT template for legal document parsing
affects: [03-02, 03-03, 04-rfp-response-generation, 05-interrogatory-response-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [claude-base64-pdf-document-block, structured-output-via-output_config, zod-json-schema-dual-validation, tdd-red-green-refactor]

key-files:
  created:
    - src/actions/extract.ts
    - src/lib/extraction/schema.ts
    - src/lib/extraction/prompt.ts
    - src/__tests__/extraction-schema.test.ts
    - src/__tests__/extract.test.ts
    - drizzle/0001_modern_overlord.sql
  modified:
    - src/lib/db/schema.ts
    - src/actions/documents.ts

key-decisions:
  - "Claude base64 PDF document block for extraction instead of text extraction + classify pattern"
  - "Dual validation: Zod schema for runtime + JSON schema for Claude output_config"
  - "Re-extract safety: delete old requests before inserting new ones"
  - "Auto-name case only when name is null to prevent overwriting user edits"

patterns-established:
  - "Claude document block pattern: base64-encode PDF, send as type:document content block"
  - "Structured output pattern: output_config with json_schema format for type-safe Claude responses"
  - "Dual schema pattern: Zod for runtime validation, parallel JSON schema for Claude output_config"
  - "TDD for server actions: mock Anthropic SDK class, db, auth, fetch in vitest"

requirements-completed: [UPLD-03, UPLD-04, UPLD-05]

# Metrics
duration: 5min
completed: 2026-04-03
---

# Phase 3 Plan 1: Extraction Pipeline Backend Summary

**Claude-powered PDF extraction pipeline with base64 document blocks, structured output validation, and extracted_requests database storage**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-03T15:48:27Z
- **Completed:** 2026-04-03T15:53:31Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Full extraction pipeline: fetch PDF from Vercel Blob, base64-encode, send to Claude with document block, validate structured JSON response, store in database
- Database schema extended with extractedRequests table and documents.subType column, with Drizzle migration applied
- Dual validation layer: Zod schema for runtime parsing + JSON schema for Claude's output_config structured output
- Case auto-naming from PDF caption with null-check protection (D-09/D-10)
- 17 new tests (8 schema + 9 action) all passing, full suite green (38 total)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database schema extension and extraction schemas** - `5722ce5` (test: RED), `06a33c7` (feat: GREEN)
2. **Task 2: Extraction server action and document sub-type action** - `4fb011f` (test: RED), `3dcd924` (feat: GREEN)

## Files Created/Modified
- `src/actions/extract.ts` - extractRequests server action: full Claude PDF extraction pipeline
- `src/actions/documents.ts` - Added updateDocumentSubType action for manual override
- `src/lib/db/schema.ts` - extractedRequests table, subType column, relations
- `src/lib/extraction/schema.ts` - Zod extractionResponseSchema + EXTRACTION_JSON_SCHEMA for Claude output_config
- `src/lib/extraction/prompt.ts` - EXTRACTION_PROMPT template for legal document parsing
- `src/__tests__/extraction-schema.test.ts` - 8 tests for Zod/JSON schema validation
- `src/__tests__/extract.test.ts` - 9 tests for extraction action with mocked Claude/DB/auth
- `drizzle/0001_modern_overlord.sql` - Migration: CREATE TABLE extracted_requests + ALTER documents ADD sub_type

## Decisions Made
- Used Claude base64 PDF document block (type: "document") instead of the text extraction + classify pattern from Phase 2. This sends the full PDF to Claude for native parsing, handling both digital and scanned PDFs without separate OCR.
- Dual validation with both Zod schema (runtime) and JSON schema (Claude output_config) to get type-safe structured output from Claude's API.
- Delete-before-insert pattern for re-extraction safety -- allows re-running extraction without duplicate data.
- Case auto-naming fires only when case.name is null, preserving any user-edited name.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed vitest v4 mock constructor for Anthropic SDK**
- **Found during:** Task 2 (extract.test.ts GREEN phase)
- **Issue:** vitest v4 requires class-based mocks for constructors, `vi.fn().mockImplementation(() => ...)` no longer works for `new Anthropic()`
- **Fix:** Changed mock to use `class MockAnthropic` with messages property
- **Files modified:** src/__tests__/extract.test.ts
- **Verification:** All 9 tests pass
- **Committed in:** 3dcd924 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test mock syntax update for vitest v4 compatibility. No scope creep.

## Issues Encountered
None beyond the mock fix documented above.

## User Setup Required
None - no external service configuration required. ANTHROPIC_API_KEY already configured from Phase 2.

## Known Stubs
None - all code is fully functional with real data paths wired.

## Next Phase Readiness
- extractRequests() server action ready for UI wiring in Plan 02 (extraction trigger and status display)
- updateDocumentSubType() ready for manual sub-type override in Plan 02
- extractedRequests table ready for query in Plan 02/03 (displaying extracted requests in UI)
- Zod schema and JSON schema available for any future extraction needs

## Self-Check: PASSED

All 8 created/modified files verified present. All 4 commit hashes verified in git log.

---
*Phase: 03-pdf-parsing-request-extraction*
*Completed: 2026-04-03*
