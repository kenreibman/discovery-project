# Phase 4: RFP Response Generation - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers AI-generated responses for every extracted RFP request in a single generation pass. The AI reads both the discovery requests and the complaint PDF, classifies each request into one of Jessica's response patterns, and generates a complete draft response set. Results are stored in the database and displayed inline on the case detail page.

This phase does NOT include: the Review UI (Phase 6), Word export (Phase 8), interrogatory responses (Phase 5), or document assembly (Phase 7).

</domain>

<decisions>
## Implementation Decisions

### Response Patterns & Voice
- **D-01:** AI uses complaint-aware classification. Both the RFP document and complaint PDF are analyzed together. The complaint context drives pattern selection: allegations in complaint -> "produced all", things plaintiff wouldn't have -> "no such documents", overly broad/privileged/premature language -> objection.
- **D-02:** Four response patterns derived from Jessica's Swan case responses:
  - **Pattern A — "Produced all"**: `"Plaintiff has produced all such documents in his possession."` (default when documents likely exist)
  - **Pattern B — "No such documents"**: `"No such documents exist."` or `"Plaintiff is not in possession of any such documents."` (when plaintiff clearly wouldn't have the requested items)
  - **Pattern C — Objection**: Full objection formula + substantive follow-up. Objection types: privilege (attorney-client/work product), overbroad/irrelevant, premature, compound. Includes "Without waiving any objection..." followed by substantive partial response where appropriate.
  - **Pattern D — Cross-reference**: `"Defendant is referred to Plaintiff's response to request no. [X] herein."` (when a later request covers the same ground as an earlier one)
- **D-03:** AI generates full objection responses including multi-paragraph substantive follow-ups (like the damages response in Swan Request 28). Not just the objection formula — the full draft Jessica would write.
- **D-04:** AI auto-detects overlapping requests and generates cross-reference responses where appropriate.
- **D-05:** AI does NOT fabricate document existence. When uncertain, defaults to "produced all documents" (RFP-06). Never claims documents don't exist unless the request clearly asks for something the plaintiff wouldn't possess.

### Generation Flow & Trigger
- **D-06:** Streaming generation — responses stream in one at a time as Claude generates them. Jessica sees progress (e.g., "12/33 generated"). More responsive UX than waiting 60 seconds for all results.
- **D-07:** The existing disabled "Generate Responses" button (from Phase 3, D-05) becomes functional. Clicking it triggers generation for all extracted requests in the case.
- **D-08:** New `generated_responses` DB table stores responses linked to extracted requests. Responses appear inline on the case detail page. Persists across page refreshes.
- **D-09:** Full re-generate supported — a "Re-generate" button replaces all previous responses with new ones (same pattern as re-extract in Phase 3). Old responses deleted before new ones inserted.

### Complaint Context Usage
- **D-10:** Full complaint PDF sent alongside requests to Claude via base64 document block (same pattern as extraction). One API call receives both documents.
- **D-11:** If no complaint is uploaded, generation proceeds anyway with a limitation banner: "Responses generated without complaint context. Upload a complaint and re-generate for better results." Without complaint, AI defaults more heavily to "produced all documents" pattern.

### Error Handling & Cost
- **D-12:** Model: Claude Sonnet (`claude-sonnet-4-5`). Best cost/quality ratio for structured legal output. Estimated ~$0.15-0.30 per generation of a 33-request set.
- **D-13:** Partial save on failure — if generation fails partway through (e.g., API timeout), save whatever responses were generated. Show error with "Continue generation" button that picks up from where it left off. No work lost.

### Claude's Discretion
- Exact streaming implementation approach (Server-Sent Events, polling, or WebSocket)
- Database schema design for `generated_responses` table
- Prompt engineering for response quality and voice matching
- Loading/progress UX design during streaming generation
- How "Continue generation" resumes after partial failure

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sample Documents (Jessica's actual voice and patterns)
- `samples/2026-3-4 Swan Discovery Responses.docx` -- Jessica's real RFP responses showing all four patterns (produced all, no such docs, objection, cross-reference). This is the ground truth for voice and format.
- `samples/Swan - First RFP.pdf` -- The discovery requests these responses answer. Use for testing extraction + generation pipeline.

### Phase 3 Artifacts (extraction pipeline this builds on)
- `.planning/phases/03-pdf-parsing-request-extraction/03-CONTEXT.md` -- Extraction decisions that carry forward
- `.planning/phases/03-pdf-parsing-request-extraction/03-01-SUMMARY.md` -- Extraction pipeline implementation details

### Project Context
- `.planning/PROJECT.md` -- Core value, constraints, tech stack
- `.planning/REQUIREMENTS.md` -- RFP-01 through RFP-06 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/actions/extract.ts` -- Established pattern for Claude API calls with base64 PDF + structured output. Generation action should follow the same pattern.
- `src/lib/extraction/schema.ts` -- Zod + JSON schema pattern for Claude's `output_config`. Apply same approach for response generation schema.
- `src/lib/extraction/prompt.ts` -- Prompt template pattern. Create similar for generation prompt.
- `src/components/extracted-requests.tsx` -- Component that currently renders request list + disabled "Generate Responses" button. This component or a sibling will display generated responses.

### Established Patterns
- Server actions with auth guard (`const session = await auth()`)
- Vercel Blob private access with Bearer token auth for PDF fetching
- `router.refresh()` + `useEffect` state sync for updating UI after server mutations
- Drizzle ORM with SQLite/Turso, relations via `db.query` with `with:` clauses
- shadcn/ui components with Tailwind v4 styling

### Integration Points
- `src/components/extracted-requests.tsx` -- "Generate Responses" button needs to become functional
- `src/lib/db/schema.ts` -- New `generatedResponses` table + relations
- `src/actions/cases.ts` -- `getCase` query needs to include generated responses
- `src/app/(protected)/case/[id]/page.tsx` -- Server component data fetching

</code_context>

<specifics>
## Specific Ideas

- Jessica's exact objection formulas are documented verbatim in `samples/2026-3-4 Swan Discovery Responses.docx` -- the AI prompt MUST reference these exact phrases, not invent variations
- The "Without waiving any objection" bridge phrase is critical to objection responses -- it must appear between the objection and the substantive response
- Request 28 (damages) in the Swan case shows the most complex response pattern -- multi-paragraph with distinct sections for different damage categories. The AI should be capable of this level of detail.
- Cross-reference pattern (Request 29 -> 28) should detect semantic overlap, not just keyword matching

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 04-rfp-response-generation*
*Context gathered: 2026-04-04*
