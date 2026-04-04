---
phase: 04-rfp-response-generation
plan: 01
subsystem: generation-data-layer
tags: [database, schema, zod, prompt, tdd, ai-generation]
dependency_graph:
  requires: [extractedRequests table, extraction schema pattern]
  provides: [generatedResponses table, generationResponseSchema, buildGenerationPrompt]
  affects: [04-02 streaming pipeline, 04-03 generation UI]
tech_stack:
  added: []
  patterns: [Zod enum validation, Drizzle relation extension, TDD red-green]
key_files:
  created:
    - src/lib/generation/schema.ts
    - src/lib/generation/prompt.ts
    - src/__tests__/generation-schema.test.ts
    - drizzle/0002_worried_scream.sql
  modified:
    - src/lib/db/schema.ts
    - drizzle/meta/_journal.json
decisions:
  - "Four response patterns encoded as Zod enum: produced_all, no_such_documents, objection, cross_reference"
  - "Objection types as Zod enum: privilege, overbroad_irrelevant, premature, compound"
  - "objectionTypes stored as JSON text string in SQLite (no native array type)"
  - "Prompt uses verbatim objection formulas from Swan case, not paraphrased versions"
  - "Conditional complaint handling: different rule 5 text based on hasComplaint boolean"
metrics:
  duration: 6min
  completed: "2026-04-04T04:58:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 6
  tests_added: 8
  tests_total: 46
---

# Phase 4 Plan 1: Database Schema, Validation, and Prompt Template Summary

Zod validation schema with four response patterns, database table for generated responses with cascade FK to extractedRequests, and system prompt encoding Jessica's exact objection formulas from the Swan case.

## What Was Done

### Task 1: Database schema extension and generation Zod schema with tests (TDD)

**RED phase:** Created 8 failing test cases in `src/__tests__/generation-schema.test.ts` covering all four response patterns (produced_all, no_such_documents, objection, cross_reference), invalid pattern rejection, invalid objection type rejection, missing field rejection, and a full 33-response mixed-pattern Swan-like set.

**GREEN phase:** Created `src/lib/generation/schema.ts` with:
- `responsePatternEnum`: z.enum(["produced_all", "no_such_documents", "objection", "cross_reference"])
- `objectionTypeEnum`: z.enum(["privilege", "overbroad_irrelevant", "premature", "compound"])
- `generationResponseSchema`: validates responses array with request_number, pattern, objection_types (nullable array), response_text, cross_reference_number (nullable)
- Exported types: GenerationResponse, GeneratedResponse, ObjectionType, ResponsePattern

**Database extension:** Added `generatedResponses` table to `src/lib/db/schema.ts` with:
- FK to extractedRequests with cascade delete
- pattern, objectionTypes (JSON text), responseText, crossReferenceNumber columns
- Bidirectional Drizzle relations (generatedResponsesRelations + updated extractedRequestsRelations)

**Migration:** Generated `drizzle/0002_worried_scream.sql` via drizzle-kit and applied to local SQLite.

All 46 tests pass (8 new + 38 existing).

### Task 2: Generation prompt template with Jessica's exact voice patterns

Created `src/lib/generation/prompt.ts` exporting `buildGenerationPrompt(requests, hasComplaint)`.

Read Jessica's actual Swan Discovery Responses (samples/2026-3-4 Swan Discovery Responses.docx) to extract verbatim objection language. The prompt contains:

- **Pattern A (produced_all):** "Plaintiff has produced all such documents in his possession."
- **Pattern B (no_such_documents):** "No such documents exist." / "Plaintiff is not in possession of any such documents."
- **Pattern C (objection):** Four exact formulas:
  - privilege: "...seeks documents and information protected by the attorney-client privilege and/or work product doctrine."
  - overbroad_irrelevant: "...overly broad, unduly burdensome, and not reasonably calculated to lead to the discovery of admissible evidence."
  - premature: "Plaintiff objects to this request as premature."
  - compound: "Plaintiff objects to this request as compound."
- **Bridge phrase:** "Without waiving any objection, [substantive response]."
- **Pattern D (cross_reference):** "Defendant is referred to Plaintiff's response to request no. [X] herein."
- **Anti-fabrication rule:** Defaults to produced_all when uncertain
- **Conditional complaint logic:** Different classification guidance based on hasComplaint boolean

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (RED) | 9bde7a4 | test(04-01): add failing tests for generation response schema |
| 1 (GREEN+DB) | f5bf40b | feat(04-01): database schema and Zod validation for RFP response generation |
| 2 | 1dac7a9 | feat(04-01): generation prompt with Jessica's exact voice patterns from Swan case |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all artifacts are fully implemented. The schema validates real data, the prompt generates real instructions, and the database table is ready for data.

## Self-Check: PASSED

All 6 created/modified files verified present on disk. All 3 commit hashes (9bde7a4, f5bf40b, 1dac7a9) verified in git log. 46/46 tests passing.
