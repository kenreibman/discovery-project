# Phase 4: RFP Response Generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 04-rfp-response-generation
**Areas discussed:** Response patterns & voice, Generation flow & trigger, Complaint context usage, Error handling & cost

---

## Response Patterns & Voice

### Classification Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Complaint-aware | AI reads both RFP and complaint together for context-driven classification | Y |
| Default to 'produced all' | Default everything to produced, only objection on clear triggers | |
| Jessica reviews classifications | Present classification summary for approval before full responses | |

**User's choice:** Complaint-aware (Recommended)
**Notes:** None

### Objection Detail Level

| Option | Description | Selected |
|--------|-------------|----------|
| Full objection responses | Full objection formula + substantive follow-up (matches Jessica's practice) | Y |
| Objection formula only | Just the objection line, leave substantive blank | |
| Objection + placeholder | Objection formula + [SUBSTANTIVE RESPONSE NEEDED] marker | |

**User's choice:** Full objection responses (Recommended)
**Notes:** None

### Cross-References

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, auto-detect overlaps | AI identifies overlapping requests and generates cross-references | Y |
| No, respond independently | Each request gets standalone response | |
| You decide | Claude's discretion | |

**User's choice:** Yes, auto-detect overlaps (Recommended)
**Notes:** None

---

## Generation Flow & Trigger

### Generation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Single-pass generation | One API call, loading state, all results at once | |
| Streaming generation | Responses stream in one at a time with progress | Y |
| Background generation | Generate in background, notify when done | |

**User's choice:** Streaming generation
**Notes:** User preferred seeing progress over waiting for full batch

### Storage & Display

| Option | Description | Selected |
|--------|-------------|----------|
| New DB table + inline display | generated_responses table, displayed inline on case detail page | Y |
| Separate review page | DB storage but displayed on /case/[id]/review route | |
| You decide | Claude's discretion | |

**User's choice:** New DB table + inline display (Recommended)
**Notes:** None

### Re-generation

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, full re-generate | Re-generate button replaces all previous responses (like re-extract) | Y |
| Yes, keep history | Each generation creates a new version | |
| No, one-shot only | Once generated, responses are final | |

**User's choice:** Yes, full re-generate (Recommended)
**Notes:** None

---

## Complaint Context Usage

### Complaint Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Full PDF alongside requests | Send complaint PDF base64 + extracted requests to Claude together | Y |
| Pre-extracted complaint text | Extract complaint text first, then send text + requests | |
| No complaint needed | Generate based only on request language | |

**User's choice:** Full PDF alongside requests (Recommended)
**Notes:** None

### Missing Complaint Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Generate anyway, note limitation | Generate without complaint, show limitation banner | Y |
| Block generation | Require complaint before allowing generation | |
| You decide | Claude's discretion | |

**User's choice:** Generate anyway, note limitation (Recommended)
**Notes:** None

---

## Error Handling & Cost

### Model Choice

| Option | Description | Selected |
|--------|-------------|----------|
| Sonnet | Best cost/quality ratio, ~$0.15-0.30/generation | Y |
| Opus | Highest quality, ~$0.75-1.50/generation | |
| Configurable | Let Jessica choose per generation | |

**User's choice:** Sonnet (Recommended)
**Notes:** None

### Failure Recovery

| Option | Description | Selected |
|--------|-------------|----------|
| Save partial + retry remainder | Save generated responses, offer "Continue generation" | Y |
| All or nothing | Discard on failure, retry from scratch | |
| You decide | Claude's discretion | |

**User's choice:** Save partial + retry remainder (Recommended)
**Notes:** None

---

## Claude's Discretion

- Streaming implementation approach (SSE, polling, WebSocket)
- Database schema design for generated_responses table
- Prompt engineering for voice matching
- Loading/progress UX during streaming
- Resume logic for partial failure recovery

## Deferred Ideas

None
