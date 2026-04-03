# Phase 3: PDF Parsing & Request Extraction - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Take an uploaded discovery PDF and produce a numbered list of individually extracted requests that Jessica can verify before generation begins. Includes: PDF text extraction (digital and scanned), individual request parsing, discovery type sub-classification (RFP vs interrogatory), auto-naming cases from PDF captions, and an extraction verification UI on the case detail page. Does NOT include AI response generation (Phase 4+) or document assembly/export (Phase 7-8).

</domain>

<decisions>
## Implementation Decisions

### Extraction Verification Flow
- **D-01:** Extracted requests appear inline on the case detail page (`/case/[id]`), below the document list. No separate route or modal.
- **D-02:** Extraction starts automatically when a discovery_request PDF is uploaded. No manual "Extract" button for the initial extraction. Flow: upload → classify → extract → display.
- **D-03:** Each request shows a truncated preview (~100 chars) with click-to-expand for full text. Keeps 33-request lists scannable.
- **D-04:** Requests are view-only. Jessica cannot edit individual request text. If extraction is wrong, she can re-extract (Re-extract button) or re-upload a better PDF.
- **D-05:** A "Generate Responses" button appears below the extracted request list, linking to Phase 4 workflow (button is present but non-functional until Phase 4).

### Scanned PDF Handling
- **D-06:** Transparent processing — no upfront warning when a scanned PDF is detected. System attempts extraction regardless using Claude Files API. Only show an error if extraction actually fails.
- **D-07:** On extraction failure: clear, non-technical error message ("Could not extract requests from this PDF. The document may be a poor-quality scan.") with [Retry] and [Upload new] buttons. No technical jargon.
- **D-08:** Claude Files API (beta) is the primary extraction path for both digital and scanned PDFs — eliminates Tesseract.js cold-start risk on Vercel. Maintain fallback design per STATE.md blocker.

### Auto-naming from PDF
- **D-09:** During extraction, Claude reads the case caption block from the PDF and generates a short case name (e.g., "Swan v. Dollar Tree").
- **D-10:** Auto-name only sets the case name if it's currently null — never overwrites Jessica's manual edits.
- **D-11:** This fulfills the deferred D-10 from Phase 1 (auto-naming from PDF content).

### Discovery Type Refinement
- **D-12:** Sub-classification happens during the extraction AI call — one call extracts discovery type, case name, and individual requests together.
- **D-13:** Discovery types: "rfp" (Requests for Production) and "interrogatory". Stored on the document record alongside the existing "complaint" / "discovery_request" classification.
- **D-14:** Jessica can override the detected discovery sub-type via dropdown, consistent with Phase 2's classification override pattern (D-06 from Phase 2).

### Claude's Discretion
- Database schema design for extracted requests (new table vs JSON field)
- Claude Files API integration details and fallback architecture
- Extraction prompt engineering and request boundary detection logic
- Loading state UI design during extraction
- Error retry logic and timeout handling

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `.planning/PROJECT.md` — Core value, constraints, PDF parsing requirement, client context
- `.planning/REQUIREMENTS.md` — UPLD-03 (extract individual requests), UPLD-04 (handle scanned PDFs), UPLD-05 (identify discovery type)
- `.planning/ROADMAP.md` — Phase 3 success criteria, dependency on Phase 2

### Prior Phase Decisions
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-10 (auto-naming from PDF deferred to Phase 3), D-04 (Claude-inspired layout)
- `.planning/phases/02-file-upload/02-CONTEXT.md` — D-05/D-06 (AI classification with override), D-11 (case detail at /case/[id]), D-09 (client-side Blob upload)

### Tech Stack
- `CLAUDE.md` §Technology Stack — Claude Files API for PDF processing, unpdf for text extraction, @anthropic-ai/sdk for Claude calls

### Benchmark Documents
- `samples/Swan - First RFP.pdf` — 33 document requests, clearly numbered as "DOCUMENT REQUEST NO. X:", preceded by definitions/instructions boilerplate (pages 1-5)
- `samples/Swan - First Rogs.pdf` — Interrogatory set for comparison of format differences
- `samples/2026-3-4 Swan Discovery Responses.docx` — Jessica's filed RFP responses (shows expected request numbering and text)
- `samples/2026-3-4 Swan Interrogatory Responses.docx` — Jessica's filed interrogatory responses

### Existing Code
- `src/actions/classify.ts` — Current classification using unpdf + Claude Haiku. Detects scanned PDFs (no extracted text) and defaults to low confidence. Pattern to extend.
- `src/lib/db/schema.ts` — Cases table (nullable name field for auto-naming), documents table (type field to extend with sub-types)
- `src/components/case-detail.tsx` — Case detail page where extraction UI will be added
- `src/app/(protected)/case/[id]/page.tsx` — Case detail route

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/actions/classify.ts`: Already uses unpdf for text extraction and Claude Haiku for classification. Pattern for PDF→AI pipeline is established.
- `src/components/case-detail.tsx`: Case detail page with editable name, document list, and delete functionality. Extraction UI adds below existing content.
- `src/lib/db/schema.ts`: Cases table has nullable `name` field ready for auto-population. Documents table has `type` field.
- `src/components/ui/skeleton.tsx`: Skeleton component available for loading states during extraction.
- `src/components/ui/badge.tsx`: Badge component for discovery type labels (RFP, Interrogatory).
- `src/components/ui/select.tsx`: Select component for discovery type override dropdown.

### Established Patterns
- Server actions in `src/actions/` for backend operations (classify.ts, cases.ts, documents.ts)
- CaseList as server component calling getCases directly — no client-side data fetching
- Drizzle relations for db.query API (findFirst/findMany)
- Lucide icons for UI elements, Tailwind with copper #C8653A accent
- Sonner for toast notifications (upload progress, errors)

### Integration Points
- Case detail page (`src/app/(protected)/case/[id]/page.tsx`) — extraction UI renders here
- Existing upload flow (upload → classify) extends to (upload → classify → extract)
- New schema: extracted_requests table linked to documents table
- Documents table `type` field needs expansion: "complaint" | "rfp" | "interrogatory" (from "complaint" | "discovery_request")

</code_context>

<specifics>
## Specific Ideas

- The Swan RFP uses "DOCUMENT REQUEST NO. X:" format with a clear "DOCUMENTS TO BE PRODUCED" header separating boilerplate from actual requests. Parser should handle common federal court variations.
- Single AI call during extraction should return: discovery type, case name, and array of numbered requests — efficient and atomic.
- The extraction pipeline extends the existing classify.ts pattern: fetch PDF from Blob → extract text/send to Claude → parse structured response → store in database.

</specifics>

<deferred>
## Deferred Ideas

- PDF text extraction for complaint (for Phase 4-5 AI generation, not Phase 3)
- Request editing/deletion by Jessica — kept view-only for Phase 3 simplicity
- Bulk re-extraction across multiple documents
- Request quality scoring or confidence per-request

</deferred>

---

*Phase: 03-pdf-parsing-request-extraction*
*Context gathered: 2026-04-03*
