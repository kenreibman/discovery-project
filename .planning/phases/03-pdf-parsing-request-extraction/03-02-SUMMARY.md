---
phase: 03-pdf-parsing-request-extraction
plan: 02
subsystem: ui
tags: [react, shadcn-ui, extraction-ui, expand-collapse, server-actions, accessibility]

# Dependency graph
requires:
  - phase: 03-pdf-parsing-request-extraction
    provides: extractRequests server action, extractedRequests table, updateDocumentSubType action
  - phase: 02-file-upload
    provides: CaseDetail component, FileRow component, upload flow, document list
provides:
  - ExtractedRequests component for displaying parsed discovery requests with full state management
  - Auto-extraction trigger wired into upload flow for discovery_request documents
  - FileRow "extracting" status for extraction pipeline visual feedback
  - getCase query extended with extractedRequests relation data
  - Discovery sub-type badge with dropdown override in both document list and extraction section
affects: [03-03, 04-rfp-response-generation, 06-review-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [inline-extraction-section, auto-trigger-after-classification, expand-collapse-text-preview, optimistic-sub-type-update]

key-files:
  created:
    - src/components/extracted-requests.tsx
  modified:
    - src/components/file-row.tsx
    - src/components/case-detail.tsx
    - src/actions/cases.ts

key-decisions:
  - "ExtractedRequests renders inline on case detail page per D-01, not a separate route"
  - "Auto-extraction triggers immediately after classification without manual button per D-02"
  - "Text truncation at 100 chars with click-to-expand per D-03"
  - "Sub-type badge uses Select dropdown for override, same pattern as document type override"

patterns-established:
  - "Inline section pattern: filter documents by type, render per-document sub-sections"
  - "Auto-trigger pattern: chain server actions in uploadAndClassify flow (classify then extract)"
  - "Expand/collapse pattern: Set-based expandedIds state, conditional chevron rendering"
  - "Screen reader announcement: aria-live=polite region for dynamic content updates"

requirements-completed: [UPLD-03, UPLD-04, UPLD-05]

# Metrics
duration: 4min
completed: 2026-04-03
---

# Phase 3 Plan 2: Extraction Verification UI Summary

**Inline extracted requests display with expand/collapse previews, auto-extraction on upload, sub-type badge override, and loading/error states on case detail page**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-03T15:58:36Z
- **Completed:** 2026-04-03T16:02:53Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ExtractedRequests component with three visual states: loading skeleton, error with retry/upload-new, and populated request list with expand/collapse
- Auto-extraction pipeline wired into upload flow -- discovery_request documents trigger extraction immediately after classification (D-02)
- Full accessibility implementation: role=list/listitem, aria-expanded, role=alert, aria-live=polite announcements
- getCase query extended with Drizzle `with: { extractedRequests: true }` relation for server-side data loading
- Disabled "Generate Responses" button visible as Phase 4 affordance (D-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: ExtractedRequests component and FileRow status extension** - `a464b98` (feat)
2. **Task 2: Wire extraction into case detail page and auto-trigger on upload** - `5aa95b4` (feat)

## Files Created/Modified
- `src/components/extracted-requests.tsx` - Client component: request list with expand/collapse, sub-type badge, re-extract, loading skeleton, error state, Generate Responses button
- `src/components/file-row.tsx` - Extended FileUploadState with "extracting" status and Extracting... render
- `src/components/case-detail.tsx` - Auto-extraction trigger in uploadAndClassify, ExtractedRequests section render, extended props with subType and extractedRequests
- `src/actions/cases.ts` - getCase extended with `with: { extractedRequests: true }` Drizzle relation query

## Decisions Made
- ExtractedRequests renders inline on case detail page below document list, one section per discovery_request document (D-01)
- Auto-extraction triggers immediately after addDocument when docType is discovery_request, no manual trigger needed (D-02)
- Text truncation at 100 characters with "..." suffix; click/keyboard toggles full text (D-03)
- Sub-type override uses same Select-inside-Badge pattern as the existing document type override for consistency
- Generate Responses button shows but is disabled at 50% opacity with "Coming soon" title (D-05)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs

- **Generate Responses button** (`src/components/extracted-requests.tsx`, line ~260): Button is rendered disabled with `cursor-not-allowed` and 50% opacity. This is intentional per D-05 -- it becomes functional in Phase 4 (RFP Response Generation). Not a blocker for Plan 02's goal.

## Next Phase Readiness
- ExtractedRequests component ready for Phase 4 to wire the Generate Responses button
- Extraction data flows end-to-end: upload -> classify -> extract -> display
- Plan 03 (end-to-end verification) can validate the full pipeline against real documents

## Self-Check: PASSED

All 4 created/modified files verified present. Both commit hashes verified in git log.

---
*Phase: 03-pdf-parsing-request-extraction*
*Completed: 2026-04-03*
