# Phase 2: File Upload - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Jessica can upload PDF files (complaint and discovery request), have them stored securely in Vercel Blob, classified by type, and linked to a named case record. Includes case list, case detail page, and basic case management (rename, delete, re-upload). PDF parsing and AI generation are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Upload flow
- **D-01:** Single multi-file drop zone (carries forward D-05 from Phase 1). Jessica drops or selects one or more PDFs at once.
- **D-02:** Discovery request is the only required file. Complaint is optional — improves AI response quality later but doesn't block case creation.
- **D-03:** Case is auto-created on first file upload. No separate "create case" step.
- **D-04:** Jessica can add more files to an existing case at any time (e.g., add complaint later).

### File classification
- **D-05:** AI auto-detect using Claude. Extract first page text from each PDF, send to Claude for classification as "complaint" or "discovery_request".
- **D-06:** Classification result shown to Jessica with ability to override via dropdown if wrong.
- **D-07:** Cost ~$0.01/classification, 1-3 seconds per file. Use Claude Haiku for this lightweight task.

### Upload feedback
- **D-08:** Inline file list below the drop zone — no page navigation during upload. Each file shows: filename, upload progress bar, detected type (editable), and status (uploading/classifying/done).
- **D-09:** Files upload directly to Vercel Blob via client-side upload (bypasses 4.5MB serverless body limit).
- **D-10:** After all files are processed, a "Create Case" button appears (or auto-navigate to case page if user preference).

### Case detail page
- **D-11:** Dedicated `/case/[id]` route — not a modal or panel. This page will later host the generation UI in Phase 4+.
- **D-12:** Case detail shows: case name (editable), document list with types, upload date, and action buttons.
- **D-13:** Actions available on case page: rename case, delete case (with confirmation), add more documents, remove individual documents.

### Case list on dashboard
- **D-14:** Recent cases section below the upload zone on the dashboard. Each row shows: case name (or "Untitled Case"), date created, document count.
- **D-15:** Click a case row to navigate to `/case/[id]`.
- **D-16:** Case name is initially null/auto-populated — carries forward D-10 from Phase 1 (auto-naming from PDF happens in Phase 3 during parsing).

### Claude's Discretion
- Upload progress bar styling and animation
- Exact error states for failed uploads (retry UX)
- Case list sorting (most recent first is sensible default)
- File size validation UX (20MB limit per the existing shell)
- Classification confidence display (if any)

</decisions>

<specifics>
## Specific Ideas

- The existing `UploadZoneShell` component has the visual shell with drag-and-drop handlers — extend it rather than replacing it
- The database schema already has `cases` and `documents` tables with the right structure (type field, blob URL, etc.)
- Keep the warm copper accent color (#C8653A) from Phase 1 for active/hover states

</specifics>

<canonical_refs>
## Canonical References

No external specs — requirements are fully captured in decisions above and in the following project artifacts:

### Project constraints
- `.planning/PROJECT.md` — Core value prop, tech stack constraints, security requirements for confidential legal docs
- `.planning/REQUIREMENTS.md` — UPLD-01 (file upload), UPLD-02 (format support), UPLD-06 (file size limits)
- `CLAUDE.md` §Technology Stack — Vercel Blob for storage, unpdf for text extraction, @anthropic-ai/sdk for Claude calls

### Prior phase decisions
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-05 (single drop zone), D-09 (case/document schema), D-10 (auto-naming from PDF)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/upload-zone-shell.tsx`: Drag-and-drop visual shell with hover/active states. Extend with actual file handling, progress, and file list.
- `src/lib/db/schema.ts`: `cases` and `documents` tables already defined with correct fields (type, blobUrl, mimeType, etc.)
- `src/lib/db/index.ts`: Database connection already configured for Turso/libSQL.

### Established Patterns
- Client components use `"use client"` directive
- Lucide icons for UI elements (Upload icon already in use)
- Tailwind with custom color values (copper #C8653A for accents)
- Protected routes under `(protected)` route group

### Integration Points
- Dashboard page (`src/app/(protected)/dashboard/page.tsx`) renders UploadZoneShell — add case list below it
- New route needed: `src/app/(protected)/case/[id]/page.tsx`
- Server actions or API routes needed for: file upload to Vercel Blob, case CRUD, document CRUD, Claude classification

</code_context>

<deferred>
## Deferred Ideas

- PDF text extraction and parsing — Phase 3
- Auto-naming cases from PDF content — Phase 3 (D-10 from Phase 1)
- AI generation of discovery responses — Phase 4+
- Bulk case operations — not currently planned

</deferred>

---

*Phase: 02-file-upload*
*Context gathered: 2026-04-01*
