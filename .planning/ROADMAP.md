# Roadmap: Discovery Response Drafter

## Overview

Nine phases take this project from zero to a production tool Jessica can use to eliminate the blank-page problem for every discovery response set. The architecture is deliberately bottom-up: authentication and security come first because legal documents are confidential from day one. File upload and PDF parsing follow as the irreplaceable dependency root — nothing can be generated until individual requests are extracted. RFP generation precedes interrogatory generation because RFPs are formulaic (three output patterns) and lower AI risk, letting the pipeline be validated before tackling the harder fact-to-answer reasoning of interrogatories. The review UI and document assembly phases are treated as first-class deliverables, not polish — the review UI is where Jessica fulfills her professional responsibility obligation, and Word export must match her formatting exactly or the tool is rejected regardless of AI quality. Production hardening closes the loop with graceful degradation, error handling, and the edge cases that emerge from real-world use.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffold, database schema, authentication, and security baseline
- [ ] **Phase 2: File Upload** - Vercel Blob client-side upload, case record creation, and secure file storage
- [ ] **Phase 3: PDF Parsing & Request Extraction** - Claude base64 PDF processing, structured output extraction, and individual request parsing
- [ ] **Phase 4: RFP Response Generation** - Batched AI generation of RFP responses using Jessica's four-pattern model
- [ ] **Phase 5: Interrogatory Response Generation** - Complaint-fact-to-answer reasoning and interrogatory response drafting
- [ ] **Phase 6: Review UI** - Side-by-side request/response interface with approve, edit, and flag controls
- [ ] **Phase 7: Document Assembly** - Auto-insertion of general statements boilerplate, signature block, verbatim request copy, and headers
- [ ] **Phase 8: Word Export** - .docx generation matching Jessica's exact formatting, ready to file
- [ ] **Phase 9: Production Hardening** - Error handling, retry logic, graceful degradation, and edge-case polish

## Phase Details

### Phase 1: Foundation
**Goal**: Jessica can log in securely and no confidential data is exposed to unauthenticated users
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Jessica can log in with email and password and reach a protected dashboard
  2. Any attempt to access the app without logging in is redirected to the login page
  3. Refreshing the browser keeps Jessica logged in (session persists)
  4. All traffic between browser and server uses HTTPS — no plain HTTP access possible
  5. Uploaded documents cannot be accessed via public URL by an unauthenticated request
**Plans**: 3 plans
Plans:
- [x] 01-01-PLAN.md — Project scaffold, database schema, Auth.js configuration, middleware, and test framework
- [x] 01-02-PLAN.md — Login page UI with server action and inline error handling
- [x] 01-03-PLAN.md — Dashboard shell with sidebar, greeting, drop zone, and visual verification checkpoint
**UI hint**: yes

### Phase 2: File Upload
**Goal**: Jessica can upload a complaint and a discovery request PDF and have them stored securely as a named case
**Depends on**: Phase 1
**Requirements**: UPLD-01, UPLD-02, UPLD-06
**Success Criteria** (what must be TRUE):
  1. Jessica can upload a PDF via drag-and-drop or a file picker in the browser
  2. Both a complaint PDF and a discovery request PDF can be uploaded as a single case
  3. Uploaded files are stored in Vercel Blob and linked to a case record in the database
  4. Files are not accessible to unauthenticated requests and not used for model training
**Plans**: 3 plans
Plans:
- [x] 02-01-PLAN.md — Install dependencies, upload API route, and server actions for case/document CRUD and AI classification
- [x] 02-02-PLAN.md — Upload zone UI with progress bars, AI classification, file list, Create Case button, and dashboard case list
- [ ] 02-03-PLAN.md — Case detail page with document management, sidebar case entries with active state
**UI hint**: yes

### Phase 3: PDF Parsing & Request Extraction
**Goal**: The system can take an uploaded discovery PDF and produce a numbered list of individually extracted requests that Jessica can verify before generation begins
**Depends on**: Phase 2
**Requirements**: UPLD-03, UPLD-04, UPLD-05
**Success Criteria** (what must be TRUE):
  1. After uploading a digital PDF, Jessica sees each individual numbered request listed separately
  2. After uploading a scanned/OCR PDF, the system still extracts requests without failing silently
  3. The system correctly identifies whether the uploaded document is an RFP or an interrogatory set
  4. Jessica can inspect the extracted request list and catch parsing errors before generation starts
**Plans**: 3 plans
Plans:
- [x] 03-01-PLAN.md — Database schema extension (extracted_requests table, sub-type column) and Claude extraction pipeline (server action, structured output, prompt)
- [x] 03-02-PLAN.md — Extraction verification UI (request list with expand/collapse, sub-type badge, auto-trigger on upload, loading/error states)
- [ ] 03-03-PLAN.md — End-to-end verification checkpoint (user tests full extraction flow with Swan RFP)
**UI hint**: yes

### Phase 4: RFP Response Generation
**Goal**: For any uploaded RFP set, the AI generates a complete draft response for every request in one pass using Jessica's exact voice and four-pattern model
**Depends on**: Phase 3
**Requirements**: RFP-01, RFP-02, RFP-03, RFP-04, RFP-05, RFP-06
**Success Criteria** (what must be TRUE):
  1. All responses for an RFP set are generated in a single pass — no request-by-request interaction required
  2. Each response is classified into one of four patterns: "produced all documents," "no such documents exist," objection with explanation, or cross-reference to a prior response
  3. Objection language matches Jessica's exact formulas (privilege, overbroad/irrelevant, premature, compound) — no invented variations
  4. Objection responses include "without waiving any objection" followed by a substantive partial response where appropriate
  5. The AI does not fabricate document existence — defaults to "produced all documents" when document status is uncertain
**Plans**: 3 plans
Plans:
- [ ] 04-01-PLAN.md — Database schema (generatedResponses table), Zod validation schema, generation prompt with Jessica's exact voice patterns
- [ ] 04-02-PLAN.md — SSE streaming Route Handler for Claude generation, server action for response cleanup, extended getCase query
- [ ] 04-03-PLAN.md — Generation UI (functional Generate button, streaming progress, inline response display, re-generate flow, limitation banner, visual verification)
**UI hint**: yes

### Phase 5: Interrogatory Response Generation
**Goal**: For any uploaded interrogatory set, the AI drafts a complete response for each interrogatory using objection patterns and facts drawn exclusively from the complaint
**Depends on**: Phase 4
**Requirements**: INTG-01, INTG-02, INTG-03, INTG-04, INTG-05
**Success Criteria** (what must be TRUE):
  1. Each interrogatory response follows Jessica's pattern: objection(s) → "without waiving any objection" → substantive answer
  2. Objection language uses her exact patterns (privilege, compound, seeks deposition info, poses legal questions, within defendant's possession)
  3. Substantive answers are drawn from specific complaint paragraphs — no fabricated case facts
  4. The system identifies which complaint paragraphs are relevant to each interrogatory and uses them as source material
**Plans**: TBD

### Phase 6: Review UI
**Goal**: Jessica can review every AI-generated response individually, make edits, flag concerns, and track her progress through the set before exporting
**Depends on**: Phase 4
**Requirements**: RVUI-01, RVUI-02, RVUI-03, RVUI-04, RVUI-05, RVUI-06
**Success Criteria** (what must be TRUE):
  1. Each original request is displayed side-by-side with its AI-generated response on the same screen
  2. Jessica can approve, edit, or flag each response individually without affecting other responses
  3. Jessica can edit the text of any response directly in the review interface
  4. Jessica can navigate forward and backward through all requests during review
  5. A visible progress indicator shows how many responses she has reviewed (e.g., "12 of 33 reviewed")
  6. Jessica can trigger a Word export at any point during review without needing to approve every response first
**Plans**: TBD
**UI hint**: yes

### Phase 7: Document Assembly
**Goal**: Every exported response document automatically includes the correct boilerplate, headers, signature block, and verbatim request text — without Jessica manually adding any of them
**Depends on**: Phase 6
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-05
**Success Criteria** (what must be TRUE):
  1. The general statements boilerplate appears at the beginning of every exported response document, exactly as Jessica files it
  2. Jessica's signature block (firm name, address, date) appears at the end of every exported document
  3. Each original request appears verbatim before its response, labeled "RESPONSE:"
  4. The document header references the correct rule citations for the discovery type (RFP vs. interrogatory)
**Plans**: TBD

### Phase 8: Word Export
**Goal**: Jessica can download a .docx file that matches her existing formatting exactly and requires no manual reformatting before filing
**Depends on**: Phase 7
**Requirements**: DOC-04, DOC-06
**Success Criteria** (what must be TRUE):
  1. The exported .docx file opens in Microsoft Word with Jessica's exact font, spacing, margins, and caption style
  2. The document is ready to file after Jessica's review — no manual reformatting steps required
  3. The export can be triggered from the review UI and downloads immediately to Jessica's computer
**Plans**: TBD

### Phase 9: Production Hardening
**Goal**: The application handles errors, timeouts, and edge cases gracefully so Jessica can use it end-to-end without developer assistance
**Depends on**: Phase 8
**Requirements**: (no orphaned v1 requirements — all covered in Phases 1-8; this phase addresses cross-cutting reliability concerns derived from research pitfalls)
**Success Criteria** (what must be TRUE):
  1. If the Claude API is unavailable, Jessica sees a clear error message and her uploaded files are not lost
  2. If a PDF fails to parse cleanly, Jessica is notified with a specific error rather than a silent failure or blank result
  3. Long-running AI generation jobs do not time out the browser — progress is shown and the session survives
  4. The app works reliably for the Swan case documents (33 RFPs, 12 interrogatories) as a baseline acceptance test
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Planning complete | - |
| 2. File Upload | 0/3 | Planning complete | - |
| 3. PDF Parsing & Request Extraction | 2/3 | In Progress|  |
| 4. RFP Response Generation | 0/3 | Planning complete | - |
| 5. Interrogatory Response Generation | 0/TBD | Not started | - |
| 6. Review UI | 0/TBD | Not started | - |
| 7. Document Assembly | 0/TBD | Not started | - |
| 8. Word Export | 0/TBD | Not started | - |
| 9. Production Hardening | 0/TBD | Not started | - |
