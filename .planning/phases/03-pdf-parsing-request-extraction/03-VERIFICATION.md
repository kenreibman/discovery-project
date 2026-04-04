---
phase: 03-pdf-parsing-request-extraction
verified: 2026-04-03T21:20:00Z
status: human_needed
score: 12/12 must-haves verified
re_verification: false
human_verification:
  - test: "Upload a discovery PDF and confirm extraction runs automatically"
    expected: "After upload completes and classifies as discovery_request, extraction triggers without any manual action, 'Extracting...' status appears on FileRow, extracted requests appear on the case detail page"
    why_human: "Auto-trigger chain (upload -> classify -> extract -> render) requires a running server with a real Vercel Blob URL and Anthropic API key"
  - test: "Expand and collapse a long request row"
    expected: "Clicking a row with text longer than 100 characters toggles between truncated preview and full text; chevron icon switches direction"
    why_human: "DOM interaction and conditional rendering cannot be verified via static code inspection"
  - test: "Sub-type override dropdown updates badge immediately"
    expected: "Opening the badge dropdown and selecting 'Interrogatory' updates the badge text optimistically, then persists via updateDocumentSubType server action"
    why_human: "Optimistic state update + server action round-trip requires a live session"
  - test: "Re-extract shows loading skeleton and repopulates request list"
    expected: "Clicking Re-extract clears currentRequests, shows three skeleton rows with 'Extracting requests...' text, then repopulates after Claude responds"
    why_human: "Loading state transition and router.refresh() data sync require a running server"
  - test: "Auto-naming populates case name from PDF caption"
    expected: "A newly created case with name=null has its name field updated to the case name found in the PDF (e.g., 'Swan v. Dollar Tree') after extraction completes"
    why_human: "Requires live Claude API call against an actual PDF with a caption block"
---

# Phase 3: PDF Parsing & Request Extraction Verification Report

**Phase Goal:** The system can take an uploaded discovery PDF and produce a numbered list of individually extracted requests that Jessica can verify before generation begins
**Verified:** 2026-04-03T21:20:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | A discovery_request PDF sent to Claude returns structured JSON with discovery_type, case_name, and numbered requests array | VERIFIED | `extract.ts` calls `anthropic.messages.create` with base64 PDF document block and `output_config.format.type: "json_schema"`; Zod `extractionResponseSchema.parse` validates response; 9 unit tests pass confirming this pipeline |
| 2 | Both digital and scanned PDFs are processed through the same Claude base64 pipeline without separate OCR | VERIFIED | `extract.ts` fetches PDF, encodes to base64, sends as `type: "document"` content block — no OCR branch; Claude's native PDF understanding handles both formats transparently |
| 3 | Re-extraction deletes old extracted_requests rows before inserting new ones | VERIFIED | `extract.ts` line 85-87: `.delete(extractedRequests).where(eq(extractedRequests.documentId, documentId))` runs before `.insert(extractedRequests)`; unit test "deletes old extracted_requests before inserting new ones" confirms ordering |
| 4 | Auto-naming sets case name only when current name is null | VERIFIED | `extract.ts` line 110: `if (caseRecord && !caseRecord.name)` guards the update; unit tests "sets case name when null" (expects 2 updates) and "does NOT overwrite when already set" (expects 1 update) both pass |
| 5 | Document sub-type (rfp/interrogatory) is stored on the document record after extraction | VERIFIED | `extract.ts` line 100-103: `db.update(documents).set({ subType: parsed.discovery_type })`; `schema.ts` has `subType: text("sub_type")`; migration `0001_modern_overlord.sql` includes `ALTER TABLE documents ADD sub_type text` |
| 6 | After a discovery_request PDF uploads and classifies, extraction starts automatically without a manual button | VERIFIED | `case-detail.tsx` line 239-247: `if (docType === "discovery_request") { updateFileState(..., { status: "extracting" }); const result = await extractRequests(doc.id, caseData.id); }` wired directly in `uploadAndClassify` |
| 7 | Jessica sees each extracted request as a truncated preview (~100 chars) that expands on click | VERIFIED | `extracted-requests.tsx` line 337: `req.text.slice(0, 100) + "..."` for truncation; `toggleExpand(req.id)` on click; `expandedIds` Set tracks expanded state; chevron direction switches on `isExpanded` |
| 8 | Jessica sees the discovery sub-type as a badge and can override it via dropdown | VERIFIED | `extracted-requests.tsx` lines 163-187: `<Select>` wrapping `<Badge>` shows "RFP" or "Interrogatory"; `onValueChange` calls `updateDocumentSubType` with optimistic `setCurrentSubType` update |
| 9 | A Re-extract button allows re-running extraction, showing loading state during processing | VERIFIED | `extracted-requests.tsx` line 194-207: `<Button onClick={handleReExtract} disabled={isExtracting}>`; `handleReExtract` sets `isExtracting=true`, clears requests; `showLoading` shows skeleton rows + spinner |
| 10 | On extraction failure, Jessica sees the error message with Retry and Upload new buttons | VERIFIED | `extracted-requests.tsx` lines 244-282: `role="alert"` container; verbatim error text "Could not extract requests from this PDF. The document may be a poor-quality scan."; "Retry Extraction" and "Upload new" buttons present |
| 11 | A disabled Generate Responses button appears below the request list | VERIFIED | `extracted-requests.tsx` line 350-358: `<Button disabled aria-disabled="true" aria-label="Generate Responses - coming soon">Generate Responses</Button>` with `opacity-50 cursor-not-allowed` |
| 12 | Extracted requests appear inline on the case detail page below the document list | VERIFIED | `case-detail.tsx` line 430-442: filters `doc.type === "discovery_request"`, renders `<ExtractedRequests>` per document; `getCase` in `cases.ts` uses `with: { extractedRequests: true }` Drizzle relation |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/db/schema.ts` | extractedRequests table, subType column, relations | VERIFIED | Contains `extractedRequests` table, `subType: text("sub_type")`, `extractedRequestsRelations`, `extractedRequests: many(extractedRequests)` in `documentsRelations` |
| `src/lib/extraction/schema.ts` | Zod schema + JSON schema + type export | VERIFIED | Exports `extractionResponseSchema`, `EXTRACTION_JSON_SCHEMA`, `ExtractionResponse` type (42 lines, fully substantive) |
| `src/lib/extraction/prompt.ts` | Extraction prompt template | VERIFIED | Exports `EXTRACTION_PROMPT` — 20 lines with full legal document parsing instructions |
| `src/actions/extract.ts` | extractRequests server action | VERIFIED | 131 lines; full pipeline: auth guard, blob fetch with Bearer token, Claude call with base64+output_config, Zod parse, delete-insert, subType update, case auto-name, error return |
| `src/actions/documents.ts` | updateDocumentSubType action | VERIFIED | `updateDocumentSubType` at line 65-79: auth guard, `db.update(documents).set({ subType })`, `revalidatePath` |
| `src/components/extracted-requests.tsx` | Request list component with all states | VERIFIED | 378 lines; loading skeleton, error state, populated list with expand/collapse, sub-type badge+override, Re-extract button, Generate Responses button, accessibility attributes |
| `src/components/case-detail.tsx` | Extended with auto-extraction and extraction section | VERIFIED | Imports `extractRequests` and `ExtractedRequests`; `uploadAndClassify` triggers extraction; renders `<ExtractedRequests>` per discovery_request document |
| `src/components/file-row.tsx` | FileUploadState with "extracting" status | VERIFIED | `FileUploadState.status` union includes `"extracting"`; renders "Extracting..." with spinning `Loader2` in accent color |
| `src/__tests__/extract.test.ts` | Unit tests for extraction action | VERIFIED | 221 lines; 9 tests covering: Claude call structure, DB insert, subType update, auto-name (null + non-null), delete-before-insert, success return, error return |
| `src/__tests__/extraction-schema.test.ts` | Unit tests for Zod schema | VERIFIED | 90 lines; 8 tests covering: RFP parse, interrogatory parse, invalid type rejection, null case_name, missing text field, non-integer number, JSON schema required fields, enum values |
| `drizzle/0001_modern_overlord.sql` | Migration for extracted_requests + sub_type | VERIFIED | `CREATE TABLE extracted_requests` with all columns; `ALTER TABLE documents ADD sub_type text` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/actions/extract.ts` | `src/lib/extraction/schema.ts` | `import extractionResponseSchema, EXTRACTION_JSON_SCHEMA` | WIRED | Line 9-12: `import { extractionResponseSchema, EXTRACTION_JSON_SCHEMA } from "@/lib/extraction/schema"` |
| `src/actions/extract.ts` | `src/lib/extraction/prompt.ts` | `import EXTRACTION_PROMPT` | WIRED | Line 13: `import { EXTRACTION_PROMPT } from "@/lib/extraction/prompt"` |
| `src/actions/extract.ts` | `src/lib/db/schema.ts` | `import extractedRequests, documents, cases` | WIRED | Line 5: `import { extractedRequests, documents, cases } from "@/lib/db/schema"` |
| `src/actions/extract.ts` | `@anthropic-ai/sdk` | `anthropic.messages.create` with base64 PDF + output_config | WIRED | Line 49: `await anthropic.messages.create({...})` with document block and `output_config.format.type: "json_schema"` |
| `src/components/case-detail.tsx` | `src/actions/extract.ts` | `extractRequests` called after classification | WIRED | Line 48 import; line 241 call: `const result = await extractRequests(doc.id, caseData.id)` inside `if (docType === "discovery_request")` |
| `src/components/case-detail.tsx` | `src/components/extracted-requests.tsx` | `<ExtractedRequests>` render | WIRED | Line 50 import; line 435 render: `<ExtractedRequests requests={doc.extractedRequests} ...>` |
| `src/components/extracted-requests.tsx` | `src/actions/documents.ts` | `updateDocumentSubType` for override | WIRED | Line 24 import; line 168 call in `onValueChange` |
| `src/actions/cases.ts` | `src/lib/db/schema.ts` | `with: { extractedRequests: true }` in getCase | WIRED | Line 106-108: `with: { extractedRequests: true }` in `db.query.documents.findMany` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `extracted-requests.tsx` | `currentRequests` | Props `requests` from `case-detail.tsx` → `getCase()` → `db.query.documents.findMany({ with: { extractedRequests: true } })` | Yes — Drizzle relation query against `extracted_requests` table populated by `extractRequests()` action | FLOWING |
| `extracted-requests.tsx` | `currentSubType` | Props `discoverySubType` from `case-detail.tsx` → `getCase()` → `documents.subType` column | Yes — set by `db.update(documents).set({ subType: parsed.discovery_type })` in `extractRequests()` | FLOWING |
| `case-detail.tsx` | `doc.extractedRequests` | `getCase()` return value from `cases.ts` | Yes — Drizzle `with: { extractedRequests: true }` loads real rows from `extracted_requests` table | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 17 unit tests pass (schema + action) | `npx vitest run src/__tests__/extraction-schema.test.ts src/__tests__/extract.test.ts` | 17 passed, 0 failed | PASS |
| TypeScript compiles clean | `npx tsc --noEmit` | Exit 0, no errors | PASS |
| Migration SQL contains expected DDL | Read `drizzle/0001_modern_overlord.sql` | `CREATE TABLE extracted_requests` + `ALTER TABLE documents ADD sub_type text` | PASS |
| End-to-end flow with real PDF | Requires running server + API key | Cannot run without live environment | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| UPLD-03 | 03-01, 03-02, 03-03 | System extracts individual numbered requests from discovery request PDF | SATISFIED | `extractRequests()` stores each request as a separate `extracted_requests` row; `ExtractedRequests` renders them as individually numbered list items; user confirmed 33 requests extracted in 03-03 |
| UPLD-04 | 03-01, 03-02, 03-03 | System handles both digital and scanned/OCR PDFs from opposing counsel | SATISFIED | Claude base64 PDF document block handles native PDF parsing for both digital and scanned documents without separate OCR; user confirmed in 03-03 (Test 6 noted for future scanned PDF testing) |
| UPLD-05 | 03-01, 03-02, 03-03 | System identifies discovery request type (RFP vs. interrogatory) from uploaded document | SATISFIED | `extractionResponseSchema` enforces `discovery_type: z.enum(["rfp", "interrogatory"])`; `documents.subType` stores it; "RFP" badge confirmed by user in 03-03 Test 2 |

No orphaned requirements. REQUIREMENTS.md maps only UPLD-03, UPLD-04, UPLD-05 to Phase 3 — all three accounted for.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `extracted-requests.tsx` | 354-355 | `aria-label="Generate Responses - coming soon"`, `title="Coming soon"` | Info | Intentional per D-05 — Generate Responses button is a Phase 4 placeholder. The disabled state is the designed behavior, not a gap. |

No blockers or warnings found. The "coming soon" annotation on the Generate Responses button is explicitly specified in D-05 and plan 03-02 "Known Stubs" section.

### Human Verification Required

#### 1. Upload and Automatic Extraction (UPLD-03, D-02)

**Test:** Upload `samples/Swan - First RFP.pdf` via the case detail page. Observe the "Extracting..." status on the FileRow. After completion, verify the Extracted Requests section appears with individually numbered requests (expect ~33).
**Expected:** Requests appear inline below the document list with truncated previews. Clicking a long request expands it to full text.
**Why human:** Auto-extraction chain (classify action result -> extractRequests call -> router.refresh() -> server re-render) requires a live server with Vercel Blob access and an Anthropic API key. The 03-03 SUMMARY confirms this was verified by the user with the real Swan RFP PDF.

#### 2. Expand/Collapse Interaction (D-03)

**Test:** Click a request row that has more than 100 characters of text. Click it again.
**Expected:** First click expands to full text with ChevronDown icon. Second click collapses to truncated preview with ChevronRight icon.
**Why human:** DOM interaction and React state transitions require a running browser session.

#### 3. Sub-type Badge Override (D-14)

**Test:** Click the "RFP" badge in the Extracted Requests header. Select "Interrogatory" from the dropdown.
**Expected:** Badge text updates immediately to "Interrogatory" (optimistic update). The change persists on page refresh (server action completed).
**Why human:** Optimistic update + server action persistence requires live state and DB connectivity.

#### 4. Re-extract Loading State and Repopulation (D-04)

**Test:** Click "Re-extract" button.
**Expected:** Loading skeleton (3 rows) and "Extracting requests..." text appear immediately. After Claude responds, the request list repopulates with the same requests.
**Why human:** State transition timing and router.refresh() server-data sync cannot be verified statically.

#### 5. Auto-Naming from PDF Caption (D-09)

**Test:** Create a new case by uploading a discovery PDF from the dashboard (so the case starts with name=null). Observe the case name after extraction completes.
**Expected:** Case name field auto-populates with the case name extracted from the PDF caption (e.g., "Swan v. Dollar Tree"). A case that already has a name should not be renamed.
**Why human:** Requires a live Claude API call against a real PDF and a case record with `name=null` in the database.

### Gaps Summary

No gaps. All 12 observable truths are verified in the codebase. All 11 required artifacts exist, are substantive, and are wired. All 8 key links are confirmed. All 3 requirement IDs are satisfied. The 17 unit tests pass and TypeScript compiles clean.

The only items requiring human verification are live-environment behaviors that cannot be confirmed by static analysis: the upload-to-extraction pipeline, DOM interactions, and Claude API behavior against real PDFs. The 03-03-SUMMARY documents that the user performed these tests and confirmed all 7 test groups passed on 2026-04-03.

---

_Verified: 2026-04-03T21:20:00Z_
_Verifier: Claude (gsd-verifier)_
