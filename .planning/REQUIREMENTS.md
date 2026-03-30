# Requirements: Discovery Response Drafter

**Defined:** 2026-03-29
**Core Value:** Eliminate the blank page problem for discovery responses — Jessica starts from a quality draft instead of scratch.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Upload & Parsing

- [ ] **UPLD-01**: User can upload discovery request PDFs via drag-and-drop or file picker
- [ ] **UPLD-02**: User can upload complaint PDF for case context
- [ ] **UPLD-03**: System extracts individual numbered requests from discovery request PDF
- [ ] **UPLD-04**: System handles both digital and scanned/OCR PDFs from opposing counsel
- [ ] **UPLD-05**: System identifies discovery request type (RFP vs. interrogatory) from uploaded document
- [ ] **UPLD-06**: Uploaded files are stored securely with no data used for model training

### RFP Response Generation

- [ ] **RFP-01**: AI generates a response for each RFP request using Jessica's three patterns: "produced all documents," "no such documents exist," or objection with explanation
- [ ] **RFP-02**: AI classifies each request into the correct response pattern based on complaint context and request language
- [ ] **RFP-03**: Objections use Jessica's exact language formulas: privilege, overbroad/irrelevant, premature, compound
- [ ] **RFP-04**: Objection responses include "without waiving any objection" followed by a substantive partial response where appropriate
- [ ] **RFP-05**: All responses are generated in a single pass (full-draft-first workflow, not request-by-request)
- [ ] **RFP-06**: AI does not fabricate facts — defaults to "produced all documents" when unsure whether documents exist

### Interrogatory Response Generation

- [ ] **INTG-01**: AI generates objection language for each interrogatory using Jessica's patterns (privilege, compound, seeks deposition info, poses legal questions, within defendant's possession)
- [ ] **INTG-02**: AI drafts substantive answers by extracting relevant facts from the complaint
- [ ] **INTG-03**: Responses follow Jessica's pattern: objection(s) → "without waiving any objection" → substantive answer
- [ ] **INTG-04**: AI identifies which complaint paragraphs are relevant to each interrogatory
- [ ] **INTG-05**: AI does not fabricate case facts — only uses information present in the uploaded complaint

### Document Assembly & Export

- [ ] **DOC-01**: General statements boilerplate is auto-inserted at the beginning of every response document
- [ ] **DOC-02**: Signature block is auto-inserted at the end with Jessica's firm details and date
- [ ] **DOC-03**: Each request is copied verbatim before its response, labeled with "RESPONSE:"
- [ ] **DOC-04**: Export produces a .docx file matching Jessica's existing formatting (font, spacing, margins, caption style)
- [ ] **DOC-05**: Appropriate header text is auto-generated based on discovery type (RFP vs. interrogatory) referencing correct rule citations
- [ ] **DOC-06**: Exported document is ready to file after Jessica's review — no manual reformatting needed

### Review UI

- [ ] **RVUI-01**: Side-by-side view showing each original request alongside its AI-generated response
- [ ] **RVUI-02**: User can approve, edit, or flag each individual response
- [ ] **RVUI-03**: User can edit response text directly in the review UI
- [ ] **RVUI-04**: User can navigate between requests (previous/next) during review
- [ ] **RVUI-05**: Review progress is visible (e.g., "12 of 33 reviewed")
- [ ] **RVUI-06**: User can export to Word after reviewing (does not require approving every response)

### Authentication & Security

- [x] **AUTH-01**: User can log in with email and password
- [x] **AUTH-02**: Unauthenticated users cannot access any functionality
- [x] **AUTH-03**: User session persists across browser refresh
- [x] **AUTH-04**: All data transmitted over HTTPS
- [x] **AUTH-05**: Uploaded documents are not accessible to other users or exposed publicly

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Attorney Support

- **MULT-01**: New attorneys can register and create accounts
- **MULT-02**: Each attorney has their own templates and objection language
- **MULT-03**: Per-attorney billing and usage tracking

### Client Questionnaire (Bridge-Style)

- **BRDG-01**: Interrogatories translated to plain English for client review
- **BRDG-02**: Client receives email link to answer questions in browser
- **BRDG-03**: Client answers auto-integrated into response document

### Requests for Admission (RFA)

- **RFA-01**: AI generates admit/deny responses for RFAs
- **RFA-02**: RFA-specific objection patterns

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Multi-state jurisdiction support | Jessica practices exclusively in SDNY/EDNY federal courts |
| Practice management integration (Clio, MyCase) | Jessica doesn't use PM software |
| Document production / Bates numbering | Separate workflow from response drafting |
| Propounding discovery (creating questions) | Different product entirely — we only do responses |
| Citation checking / Bluebook formatting | Discovery responses don't cite case law |
| E-service / filing integration | Jessica files through ECF manually |
| Spanish translation | Output is for Jessica, not her clients |
| Redaction capabilities | Jessica handles redaction in her existing workflow |
| Case timeline / deposition prep | Scope creep beyond core discovery response value |
| Mobile app | Jessica works on desktop with Word |
| Objection menu / library UI | Jessica's objections are baked into AI prompts, no menu needed |
| Real-time collaboration | Single user tool |
| Offline mode | Always-online is acceptable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| UPLD-01 | Phase 2 | Pending |
| UPLD-02 | Phase 2 | Pending |
| UPLD-03 | Phase 3 | Pending |
| UPLD-04 | Phase 3 | Pending |
| UPLD-05 | Phase 3 | Pending |
| UPLD-06 | Phase 2 | Pending |
| RFP-01 | Phase 4 | Pending |
| RFP-02 | Phase 4 | Pending |
| RFP-03 | Phase 4 | Pending |
| RFP-04 | Phase 4 | Pending |
| RFP-05 | Phase 4 | Pending |
| RFP-06 | Phase 4 | Pending |
| INTG-01 | Phase 5 | Pending |
| INTG-02 | Phase 5 | Pending |
| INTG-03 | Phase 5 | Pending |
| INTG-04 | Phase 5 | Pending |
| INTG-05 | Phase 5 | Pending |
| DOC-01 | Phase 7 | Pending |
| DOC-02 | Phase 7 | Pending |
| DOC-03 | Phase 7 | Pending |
| DOC-04 | Phase 8 | Pending |
| DOC-05 | Phase 7 | Pending |
| DOC-06 | Phase 8 | Pending |
| RVUI-01 | Phase 6 | Pending |
| RVUI-02 | Phase 6 | Pending |
| RVUI-03 | Phase 6 | Pending |
| RVUI-04 | Phase 6 | Pending |
| RVUI-05 | Phase 6 | Pending |
| RVUI-06 | Phase 6 | Pending |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 34 total
- Mapped to phases: 34
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after roadmap creation (all 34 requirements mapped)*
