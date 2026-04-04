# Discovery Response Drafter

## What This Is

A web tool where plaintiff's civil rights attorney Jessica Massimi uploads opposing counsel's discovery requests and the complaint, and the AI generates a fully formatted Word document draft response in her voice — ready for her to review, edit, and file. Built specifically for her civil rights litigation practice, trained on her exact templates, objection language, and writing style.

## Core Value

Eliminate the blank page problem for discovery responses — the hardest, most time-consuming part of Jessica's practice — so she starts from a quality draft instead of scratch.

## Requirements

### Validated

- [x] Simple authentication (login for Jessica) — Validated in Phase 1: Foundation
- [x] Upload complaint and discovery request PDFs via browser — Validated in Phase 2: File Upload
- [x] AI parses discovery requests and extracts individual requests — Validated in Phase 3: PDF Parsing
- [x] AI generates a response for each request using Jessica's voice and templates — Validated in Phase 4: RFP Response Generation
- [x] RFP responses use her four patterns: produced all, no such documents, objection, cross-reference — Validated in Phase 4: RFP Response Generation
- [x] Objections use her exact language: privilege, overbroad, premature, compound formulas — Validated in Phase 4: RFP Response Generation

### Active
- [ ] General statements boilerplate included automatically
- [ ] Signature block included automatically
- [ ] Side-by-side review UI: see each request + AI response, approve/edit/flag individually
- [ ] Export final output as properly formatted Word document matching her existing style
- [ ] Interrogatory response generation (objection language + substantive answers from complaint facts)

### Out of Scope

- Multi-attorney support / multi-tenancy — v2, after validating with Jessica
- Requests for Admission (RFAs) — not in Jessica's current workflow
- Case law research / citations — this drafts responses, not legal research
- Practice management integration — Jessica doesn't use Clio/MyCase
- Autodoc-style document production with Bates numbering — too complex for v1
- Bridge-style client questionnaire portal — v2 feature after core response drafting works
- Mobile app — web-first, Jessica works on desktop

## Context

**The client:** Jessica Massimi, solo civil rights attorney, Massimi Law PLLC, 99 Wall Street Suite 1264, New York NY 10005. Handles ~40 cases at a time, ~8 at discovery stage simultaneously. Works entirely in Microsoft Word. Not technical.

**The problem:** Discovery response drafting is her biggest time sink — several hours per response set. She was initially hesitant about AI ("reviewing output still takes time") but the reframe is: eliminating the blank page, not eliminating review.

**Benchmark documents (in `samples/`):**
- `Swan - First RFP.pdf` — Defendant's 33 document requests (Dollar Tree v. Swan)
- `Swan - First Rogs.pdf` — Defendant's 12 interrogatories
- `2026-3-4 Swan Discovery Responses.docx` — Jessica's filed RFP responses (benchmark output)
- `2026-3-4 Swan Interrogatory Responses.docx` — Jessica's filed interrogatory responses (benchmark output)

**Case context:** Tyrone Swan v. Dollar Tree Stores Inc., Case No. 1:25-CV-04666-JPO-VF, SDNY. Workplace sexual harassment and wrongful termination. These documents serve as the training examples for Jessica's voice and patterns.

**Response patterns observed:**
- RFPs: Highly formulaic. Three response types — "produced all documents," "no such documents exist," or objection with case-specific explanation. Most responses are one of the first two stock phrases.
- Interrogatories: Less formulaic. Standard objection language (privilege, compound, etc.) followed by "without waiving any objection" and substantive case-specific answers.
- Both start with identical general statements boilerplate and end with her signature block.

**Competitive landscape:** Briefpoint is the closest competitor (briefpoint.ai). They use a request-by-request interactive flow, support all 50 states, trained on 230K+ objections. Our advantage: purpose-built for civil rights litigation with Jessica's exact templates. Briefpoint is general-purpose and requires per-request attorney interaction; we generate a full draft upfront.

**Business context:** Developer (Kenstera, kenstera.com) already manages Jessica's website jessicamassimi.com. This is a separate web app — not integrated into her marketing site. Potential to expand to other solo attorneys later.

## Constraints

- **Tech stack**: Next.js + Vercel — developer's preferred stack
- **AI**: Claude API for document generation
- **Auth**: Simple email/password for v1 (Jessica only)
- **File format**: Must output .docx matching her existing formatting (font, spacing, margins)
- **PDF parsing**: Must handle scanned PDFs from opposing counsel (OCR may be needed)
- **Security**: Confidential legal documents — HTTPS, no data used for training, secure file handling
- **Budget**: Solo developer, minimize infrastructure costs (Vercel free/pro tier, Claude API usage-based)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hybrid approach (full draft + review UI) over request-by-request | Jessica's responses are formulaic enough for AI to generate a full draft; review UI gives her control without 33 individual screens | — Pending |
| RFPs first, interrogatories second | RFP responses are more templated and predictable; faster to validate the approach | — Pending |
| Separate web app, not extension of jessicamassimi.com | Security (confidential docs), independence (scalability), separation of concerns (marketing vs. tool) | — Pending |
| Simple auth (Jessica only) for v1 | Ship fast, validate with one user before building multi-tenancy | — Pending |
| Next.js + Vercel | Developer familiarity, fast deployment, good fit for full-stack web app | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-04 after Phase 4 completion*
