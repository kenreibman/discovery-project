---
phase: 04-rfp-response-generation
plan: 02
subsystem: generation-pipeline
tags: [sse, streaming, claude-api, route-handler, server-action, tdd]
dependency_graph:
  requires: [generatedResponses table, generationResponseSchema, buildGenerationPrompt, extractedRequests, documents]
  provides: [POST /api/generate SSE endpoint, deleteGeneratedResponses action, getCase with generatedResponse]
  affects: [04-03 generation UI, phase-6 review UI]
tech_stack:
  added: []
  patterns: [SSE Route Handler with ReadableStream, zodOutputFormat helper, hybrid streaming with bulk persist]
key_files:
  created:
    - src/app/api/generate/route.ts
    - src/actions/generate.ts
    - src/__tests__/generate.test.ts
  modified:
    - src/actions/cases.ts
decisions:
  - "Hybrid streaming approach: progress events via text handler counting, bulk persist after finalMessage"
  - "zodOutputFormat helper replaces manual dual Zod+JSON schema pattern from Phase 3"
  - "Partial save on error attempts to parse accumulated JSON and persist valid responses"
  - "startFrom parameter filters extractedRequests by requestNumber >= value for continue generation"
  - "getCase nests generatedResponse within extractedRequests for inline display"
metrics:
  duration: 5min
  completed: "2026-04-04T05:08:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 4
  tests_added: 11
  tests_total: 57
---

# Phase 4 Plan 2: SSE Streaming Route Handler and Response Cleanup Summary

SSE streaming Route Handler for Claude generation with progress events, bulk persistence, partial save on failure, server action for response cleanup, and extended getCase query with nested generatedResponse data.

## What Was Done

### Task 1: SSE Route Handler for streaming Claude generation with tests (TDD)

**RED phase:** Created 11 failing test cases in `src/__tests__/generate.test.ts` covering:
- Auth guard (401 when no session)
- SSE content-type header (text/event-stream)
- Complaint + RFP PDFs sent as base64 document blocks (D-10)
- RFP-only when no complaint exists (D-11)
- Model "claude-sonnet-4-5" (D-12)
- max_tokens 16384 (Pitfall 1)
- Progress events with count/total fields
- Complete event with parsed responses
- DB persistence after completion
- Error event on Claude API failure
- startFrom parameter for continue generation (D-13)

**GREEN phase:** Created `src/app/api/generate/route.ts` with:
- `export const runtime = "nodejs"`, `dynamic = "force-dynamic"`, `maxDuration = 60` (Pitfall 2, 3)
- Auth guard via `await auth()` returning 401 if no session
- Fetches all case documents to find RFP + complaint, base64-encodes both PDFs
- Uses `zodOutputFormat()` helper from `@anthropic-ai/sdk/helpers/zod` (replaces Phase 3 manual dual-schema)
- `messages.stream()` with claude-sonnet-4-5, max_tokens 16384
- Hybrid streaming: progress events count `"request_number"` occurrences in text snapshot, then bulk-persist all responses after `finalMessage()` completes
- Complete event includes all parsed responses
- Partial save on error (D-13): catches failures, attempts to parse accumulated JSON, persists valid responses, sends error event with savedCount
- `startFrom` parameter filters extractedRequests by requestNumber >= value for continue generation
- SSE headers: text/event-stream, no-cache, keep-alive

All 11 tests pass. Mock strategy simulates real SDK lifecycle: `finalMessage()` fires text handlers before resolving to test the stream event flow correctly.

### Task 2: Server action for response cleanup and extended getCase query

Created `src/actions/generate.ts` with `deleteGeneratedResponses(documentId, caseId)`:
- Auth guard via `await auth()`
- Finds all extractedRequests for the document
- Deletes all generatedResponses where requestId is in the request IDs list
- Calls `revalidatePath` to refresh UI
- Returns `{ success: boolean; error?: string }`

Extended `getCase` in `src/actions/cases.ts`:
- Changed documents query `with: { extractedRequests: true }` to nested `with: { extractedRequests: { with: { generatedResponse: true } } }`
- Each extractedRequest now includes its generatedResponse array in the query result

Full test suite passes (57/57).

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (TDD) | 2a6a02b | feat(04-02): SSE route handler for streaming Claude generation with tests |
| 2 | 13867aa | feat(04-02): server action for response cleanup and extended getCase query |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all artifacts are fully implemented. The route handler streams real progress events, persists to the database, handles errors with partial save, and supports continuation. The server action performs actual cleanup with auth guard.

## Self-Check: PASSED
