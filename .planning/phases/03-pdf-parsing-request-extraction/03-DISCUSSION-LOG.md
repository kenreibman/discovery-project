# Phase 3: PDF Parsing & Request Extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 03-pdf-parsing-request-extraction
**Areas discussed:** Extraction verification flow, Scanned PDF handling, Auto-naming from PDF, Discovery type refinement

---

## Extraction Verification Flow

### Where should the extracted request list appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline on case page (Recommended) | Extracted requests appear as a numbered list directly on /case/[id] below the document list. No extra navigation. | ✓ |
| Separate route | New /case/[id]/requests page. Keeps case detail clean, adds one extra click. | |
| Expandable panel | Collapsed section on case page that expands. Risk: 33 requests could make it very long. | |

**User's choice:** Inline on case page
**Notes:** None

### When should extraction happen?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto on upload (Recommended) | Extraction starts automatically when a discovery_request PDF is uploaded. No extra button click. | ✓ |
| Manual trigger | "Extract Requests" button on case page. Jessica controls timing. | |
| Auto with re-extract option | Auto-extracts on upload, plus "Re-extract" button for retry. | |

**User's choice:** Auto on upload
**Notes:** None

### How much detail should each extracted request show?

| Option | Description | Selected |
|--------|-------------|----------|
| Truncated preview (Recommended) | Request number + first ~100 chars with click-to-expand. Keeps 33 requests scannable. | ✓ |
| Full text | Complete request text for every item. Could be very long. | |
| Number + summary only | AI-generated one-line summary. Most compact but adds interpretation layer. | |

**User's choice:** Truncated preview
**Notes:** None

### Can Jessica edit or delete individual extracted requests?

| Option | Description | Selected |
|--------|-------------|----------|
| View-only with re-extract (Recommended) | Inspect but not edit. Re-upload or re-extract if wrong. Keeps Phase 3 simple. | ✓ |
| Editable requests | Edit text of any request inline. More complex UI. | |
| Delete only | Remove individual requests, but can't edit text. | |

**User's choice:** View-only with re-extract
**Notes:** None

---

## Scanned PDF Handling

### What should Jessica see when a scanned PDF is detected?

| Option | Description | Selected |
|--------|-------------|----------|
| Transparent processing (Recommended) | No special warning. System tries to extract regardless. Only warn if it fails. | ✓ |
| Upfront warning | Yellow banner managing expectations about scan quality. | |
| Quality indicator after extraction | Process silently, show confidence badge on results. | |

**User's choice:** Transparent processing
**Notes:** None

### When extraction fails, what should Jessica see?

| Option | Description | Selected |
|--------|-------------|----------|
| Specific error + retry (Recommended) | Clear non-technical message with Retry and Upload new buttons. | ✓ |
| Toast notification | Sonner toast with error. Less prominent. | |
| Partial results + warning | Show whatever extracted with a warning about missing items. | |

**User's choice:** Specific error + retry
**Notes:** User asked for clarification about how PDF parsing works — explained the document structure (boilerplate pages 1-5, numbered requests starting page 5+, clear "DOCUMENT REQUEST NO. X:" labels). Reviewed actual Swan RFP text to illustrate.

---

## Auto-naming from PDF

### How should case auto-naming work?

| Option | Description | Selected |
|--------|-------------|----------|
| AI extracts from caption (Recommended) | Claude reads caption block during extraction, generates short name like "Swan v. Dollar Tree". Only sets if name is null. | ✓ |
| From filename | Parse PDF filename. No AI needed but inconsistent. | |
| Skip auto-naming | Keep manual naming only. | |

**User's choice:** AI extracts from caption
**Notes:** None

---

## Discovery Type Refinement

### When should RFP vs interrogatory sub-classification happen?

| Option | Description | Selected |
|--------|-------------|----------|
| During extraction (Recommended) | Single AI call extracts discovery type, case name, and requests together. | ✓ |
| Upgrade Phase 2 classification | Expand classify.ts to detect rfp/interrogatory at upload time. | |
| Manual selection | Dropdown for Jessica to select type. No AI guessing. | |

**User's choice:** During extraction
**Notes:** None

### Should Jessica be able to override the detected discovery type?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, with dropdown (Recommended) | Detected type shown with dropdown override, consistent with Phase 2's classification override pattern. | ✓ |
| No override needed | Trust the AI — distinction is very clear from document headers. | |
| You decide | Claude's discretion. | |

**User's choice:** Yes, with dropdown
**Notes:** None

---

## Claude's Discretion

- Database schema design for extracted requests
- Claude Files API integration and fallback architecture
- Extraction prompt engineering and request boundary detection
- Loading state UI during extraction
- Error retry logic and timeout handling

## Deferred Ideas

- PDF text extraction for complaint (Phase 4-5)
- Request editing/deletion by Jessica
- Bulk re-extraction across multiple documents
- Request quality scoring or confidence per-request
