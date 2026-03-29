# Project Research Summary

**Project:** Discovery Response Drafter
**Domain:** Legal discovery response automation (solo civil rights attorney)
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

This is a single-user legal productivity tool that automates the drafting of discovery responses (Requests for Production and Interrogatories) for a solo civil rights attorney. The product sits in an active market — Briefpoint ($89/month) is the dominant competitor — but every existing tool is designed for general-purpose practice management firms, not a solo attorney with highly formulaic, jurisdiction-specific templates. The recommended approach is a focused Next.js 15 + Vercel deployment with Claude as both the PDF processor and response generator, Turso (libSQL) for data persistence, and the `docx` library for Word document assembly. The core value proposition is a "full-draft-first" workflow: upload two PDFs, get a complete Word document back, review it, export it. No menus, no per-request interaction, no configuration.

The highest-risk technical element is PDF parsing reliability. Opposing counsel frequently serves discovery as scanned PDFs, and the architecture must handle these without failure. The recommended approach is to send PDFs directly to Claude via the Files API (beta), which handles both digital and scanned documents through its vision capabilities, eliminating a complex local OCR pipeline. The second-highest risk is AI hallucination in legal language: the mitigation is to constrain Claude strictly to Jessica's own template patterns and flag any response that does not match a known pattern for manual review. The review UI must be treated as a first-class feature, not an afterthought — it is where the attorney fulfills her ethical obligation to review AI-generated content before filing.

The build should proceed in two major product phases: RFP responses first (highly formulaic, lower AI risk, delivers 80% of the value), then Interrogatory responses (require substantive fact-to-answer reasoning, higher complexity). Each product phase is further broken into pipeline stages: Upload/Parse, Generate, Review, and Export. This order lets Jessica validate the core loop with real documents before investing in the harder interrogatory problem.

---

## Key Findings

### Recommended Stack

The stack is fully determined and well-justified. Next.js 15 (App Router, Server Components, Server Actions) is the constrained framework choice, with TypeScript throughout as non-negotiable for a legal document tool. Vercel Pro ($20/month) is required — the Hobby plan's 10-second function timeout is insufficient for PDF + AI processing chains; Pro provides 60 seconds.

The most important stack decision is the database choice. ARCHITECTURE.md references Neon Postgres, while STACK.md recommends Turso (libSQL). **Resolve in favor of Turso:** it offers 9GB free storage vs. Neon's 0.5GB, better local development story (plain SQLite file, no cloud connection needed), and Drizzle ORM supports both equally. For a single-user tool this is significant. Neon is mentioned in ARCHITECTURE.md as an assumption that should be updated to Turso.

For PDF processing, the architecture recommends Claude Files API (beta) as the primary path, with unpdf + Tesseract.js as fallback. This eliminates a complex OCR pipeline in serverless, which PITFALLS.md identifies as a critical anti-pattern (Tesseract.js at 15MB+ language files will cause cold start and memory issues in Vercel functions).

**Core technologies:**
- Next.js 15 + React 19 + TypeScript 5: full-stack framework — constrained choice, App Router + Server Components reduce client bundle
- Tailwind CSS 4 + shadcn/ui: styling and components — CSS-first, no config file, component ownership (no version lock-in)
- @anthropic-ai/sdk (0.39.x+): Claude API client — official SDK, handles streaming, typed responses
- Claude 3.5 Sonnet / Claude 4 Sonnet: AI model — best cost-to-quality for structured legal document generation
- docx (9.6.x): Word document generation — programmatic API for pixel-perfect formatting control
- Turso + Drizzle ORM: database — SQLite-compatible, 9GB free tier, plain SQLite for local dev, no binary engine overhead
- Vercel Blob: file storage — client-side uploads bypass the 4.5MB serverless body limit, native Vercel integration
- Auth.js v5 (beta, production-stable): authentication — Credentials provider + bcrypt, sufficient for single user
- Claude Files API (beta): PDF processing — handles scanned + digital PDFs via vision, eliminates local OCR complexity
- zod + react-hook-form: validation and forms — validate all API inputs and AI responses

### Expected Features

The feature landscape is clearly defined. The competitive analysis is thorough (6 competitors surveyed), and the anti-features list is as valuable as the features list — it explicitly rules out scope creep that would delay delivery without adding value for Jessica's use case.

**Must have (table stakes):**
- PDF upload of discovery requests (digital and scanned) — the entry point; unusable without it
- Automatic request extraction and parsing — eliminates the manual retyping pain point
- RFP response generation using Jessica's 3 patterns (produced / none exist / objection) — core value
- General statements boilerplate (hard-coded, not AI-generated) — legally significant, must be exact
- Signature block (hard-coded template) — expected in every filed response
- Side-by-side review UI with approve/edit/flag per request — attorney ethical obligation
- Word document (.docx) export matching Jessica's formatting exactly — attorneys work in Word
- Simple email/password authentication — restrict access to confidential documents
- Complaint PDF ingestion for case context — AI needs facts to generate substantive responses

**Should have (differentiators):**
- Full-draft-first workflow (generate all responses in one pass, not request-by-request) — eliminates Briefpoint-style interaction friction
- Jessica's exact voice and templates (few-shot examples from her filed documents) — output reads like she wrote it
- RFP pattern classification (classify each request into the 3-bucket model before generating) — reduces hallucination
- Interrogatory substantive answers derived from complaint facts — harder problem, deferred to Phase 2
- Zero-interaction draft for simple formulaic RFP sets — upload two PDFs, get a Word doc back

**Defer (v2+):**
- Multi-state jurisdiction support — Jessica practices only in SDNY/EDNY federal courts
- Practice management integrations (Clio, MyCase) — Jessica does not use these
- Client questionnaire portal — adds a whole communication layer for no current need
- Document production / Bates numbering — separate workflow from response drafting
- Propounding discovery — a different product
- Multi-tenancy — single user for v1; Auth.js scales to this without architectural rewrites

### Architecture Approach

The architecture follows a clear 4-phase pipeline: Upload + Parse, Generate, Review, Export. Every component is stateless on the server (all state persists to Turso DB); files live in Vercel Blob; the serverless functions are thin orchestrators. The most important architectural constraints are: (1) PDF uploads must bypass the 4.5MB serverless body limit via Vercel Blob client upload, (2) processing must be asynchronous to avoid function timeouts, and (3) Claude Files API eliminates local OCR complexity as the primary PDF processing path.

The prompting architecture uses three layers: a baked-in system prompt (role, Jessica's voice, objection formulas), per-case context (complaint text, caption, party names), and per-request context (individual request text, type, number). For RFPs, batch 5-8 requests per Claude call; for interrogatories, process 1-2 per call with more complaint context.

**Major components:**
1. Upload Handler — validates files, generates Vercel Blob presigned tokens, creates case record in DB
2. PDF Parser / Request Extractor — sends PDFs to Claude Files API, extracts individual numbered requests, stores in DB
3. Response Generator — batched Claude calls with layered prompts (system + case context + request context), streams responses, stores in DB
4. Review UI — side-by-side RSC + Client Component interface, approve/edit/flag with optimistic updates
5. Export Engine — assembles approved responses into formatted .docx using `docx` library, uploads to Vercel Blob
6. Auth Middleware — Auth.js v5 Credentials provider, protects all routes

**Key architectural note on database:** ARCHITECTURE.md's schema uses Neon Postgres. The schema itself is correct and portable; substitute Turso/libSQL (via Drizzle) for the database connection. The schema structure (cases, requests, responses, templates tables) remains unchanged.

### Critical Pitfalls

1. **AI hallucination in legal content** — Constrain Claude strictly to Jessica's template patterns. Provide objection formulas verbatim and instruct it to select from them, never invent new ones. For RFPs, limit to 3 known output patterns. Flag any response that does not match a known pattern in the review UI. Address in prompt engineering before any other generation work.

2. **Scanned PDF parsing failure** — Use Claude Files API as the primary parser (handles scanned PDFs via vision internally). If Files API is unavailable, detect text-poor PDFs and trigger a fallback. Always show Jessica the extracted request list before generating responses so she can catch parsing errors. Never silently fail.

3. **Vercel 4.5MB serverless body limit blocks PDF upload** — Use Vercel Blob client-side upload from Day 1. The browser uploads directly to Blob; the serverless function only handles token generation and post-upload processing. This is an architectural decision that cannot be patched later without rework.

4. **Function timeout on PDF + AI processing chain** — Design for asynchronous processing from Day 1. Batch Claude calls (5-8 RFP requests per call), stream responses, break the pipeline into discrete stages. Do not process everything in a single function invocation.

5. **Word document formatting drift** — Hard-code all boilerplate (general statements, signature block) as template strings — do not generate these with AI. Capture Jessica's exact formatting specs from sample files. Test output exclusively in Microsoft Word on Windows, not in browser viewers. Validate formatting with Jessica in the very first demo, before AI quality is polished.

6. **Confidential documents handled insecurely** — Authenticate every endpoint from Day 1. Use Claude API (not consumer Claude — API data is not used for training and is deleted after 7 days). Set explicit data retention and deletion policies. Document the security posture so Jessica can inform clients.

---

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation — Upload, Parse, and Core Infrastructure
**Rationale:** Nothing works without reliable PDF parsing. This phase eliminates the two architectural landmines (4.5MB body limit, serverless OCR anti-pattern) before any application logic is built. Establishes the database schema, auth, and file storage patterns that everything else depends on.
**Delivers:** A working pipeline that takes a discovery PDF and produces a list of individually extracted requests, visible in a basic UI. Jessica can upload a real PDF and see her requests parsed correctly.
**Addresses:** PDF upload (table stakes), request extraction (table stakes), authentication (table stakes)
**Avoids:** Pitfall 3 (body size limit), Pitfall 2 (scanned PDF failure), Pitfall 6 (security)
**Stack elements:** Vercel Blob client upload, Claude Files API, Turso + Drizzle schema, Auth.js v5

### Phase 2: RFP Response Generation
**Rationale:** RFPs are formulaic (3 output patterns), lower AI risk, and represent the majority of Jessica's discovery workload. Validating the generation pipeline with RFPs before tackling interrogatories reduces overall project risk. Prompt engineering investment here directly informs Phase 4.
**Delivers:** For a given RFP set, Claude generates all responses in a single pass using Jessica's voice and patterns. Responses are stored and viewable alongside original requests.
**Addresses:** RFP response generation (table stakes + differentiator), full-draft-first workflow (differentiator), Jessica's exact voice (differentiator), RFP pattern classification (differentiator)
**Avoids:** Pitfall 1 (hallucination — constrain to 3 patterns), Pitfall 7 (prompt brittleness — test with multiple cases), Pitfall 4 (timeout — async + batched calls)
**Stack elements:** @anthropic-ai/sdk, streaming via Vercel AI SDK, layered prompt architecture

### Phase 3: Review UI and Word Export
**Rationale:** The review UI is not optional UI polish — it is where Jessica fulfills her professional responsibility obligation. PITFALLS.md identifies ignoring the review step as a high-confidence project failure mode. Word export must match her formatting exactly or the tool is rejected regardless of AI quality.
**Delivers:** Side-by-side review interface (approve/edit/flag per request) + downloadable .docx that matches Jessica's filed document style. This completes the end-to-end workflow for RFP responses.
**Addresses:** Review UI (table stakes), Word export (table stakes), general statements boilerplate (table stakes), signature block (table stakes)
**Avoids:** Pitfall 5 (formatting drift — hard-code boilerplate, test in Word), Pitfall 10 (unusable review UX — paper-prototype with Jessica first), Pitfall 13 (boilerplate variation — never AI-generate boilerplate)
**Stack elements:** docx (9.6.x), shadcn/ui components, optimistic UI updates

### Phase 4: Interrogatory Response Generation
**Rationale:** Interrogatories require substantive fact-to-answer reasoning, which is structurally harder than the RFP pattern-matching problem. The RFP workflow validates the pipeline, prompt architecture, and review/export cycle before tackling this harder problem. Setting up the two-tier approach (objection portion templated, substantive answer AI-drafted with lower confidence marking) requires lessons learned from RFPs.
**Delivers:** Interrogatory parsing and full response generation — templated objections + AI-drafted substantive answers derived from complaint facts. Two-tier confidence indicators in the review UI.
**Addresses:** Interrogatory responses (table stakes for full discovery coverage), substantive answer drafting (differentiator)
**Avoids:** Pitfall 12 (underestimating interrogatory complexity — treat as separate harder problem, set Jessica's expectations)
**Stack elements:** Existing pipeline with modified prompt architecture; increased per-call complaint context

### Phase 5: Production Hardening and Polish
**Rationale:** Auth, error handling, loading states, and graceful degradation should exist from Phase 1, but comprehensive polish (retry queues, monitoring, edge cases, UX feedback) is appropriately deferred until the core workflows are validated.
**Delivers:** Production-ready application Jessica can use end-to-end without developer assistance. Handles Claude API outages gracefully (persisted uploads, retry logic, clear error messages). Keyboard shortcuts for review power use.
**Addresses:** Graceful degradation (Pitfall 9), non-standard discovery formatting edge cases (Pitfall 8)
**Stack elements:** Error boundaries, retry logic with exponential backoff, sonner toast notifications

### Phase Ordering Rationale

- Upload/Parse must precede everything — it is the dependency root of the entire system.
- RFP generation before Interrogatory generation — the features research explicitly recommends this, and PITFALLS.md warns that RFP success creates false confidence about interrogatory difficulty.
- Review UI and Export in the same phase as RFP generation completion — the review UI has no value without generated responses, and generating responses without a review step would violate Jessica's professional responsibility obligations.
- Auth threaded through from Phase 1 — legal documents are confidential; no phase ships without authentication.
- The architectural decisions in Phase 1 (client-side upload, async processing, Claude Files API) cannot be changed without significant rework; get them right before building on top of them.

### Research Flags

Phases likely needing `/gsd:research-phase` deeper research during planning:
- **Phase 2 (RFP Generation):** Prompt engineering for legal voice replication is nuanced. Claude Files API is in beta and behavior may require empirical testing. The 3-pattern RFP classification approach needs prompt design validation.
- **Phase 4 (Interrogatory Generation):** Complaint-to-answer fact mapping is a harder AI reasoning problem. The two-tier objection + substantive answer architecture needs prompt experimentation before committing to an implementation design.

Phases with standard patterns (can skip research-phase):
- **Phase 1 (Upload + Parse):** Vercel Blob client upload is well-documented. Drizzle + Turso setup is documented with official guides. Auth.js v5 Credentials provider has established patterns.
- **Phase 3 (Review UI + Export):** shadcn/ui side-by-side layout is standard. The `docx` library is mature with extensive documentation. Optimistic UI updates are well-understood React patterns.
- **Phase 5 (Hardening):** Error handling, retry logic, toast notifications — all standard patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified at current versions (March 2026). Key stack choices are well-justified with explicit alternatives analysis. One discrepancy (Neon vs. Turso) resolved in favor of STACK.md recommendation. |
| Features | HIGH | Competitive analysis covers 6 active products. Table stakes, differentiators, and anti-features are clearly delineated. MVP scope is opinionated and well-reasoned. |
| Architecture | HIGH | Patterns are well-documented. Critical constraints (4.5MB limit, function timeout) verified from official Vercel docs. One note: ARCHITECTURE.md uses Neon Postgres in its schema/examples but the database recommendation should be Turso per STACK.md. |
| Pitfalls | HIGH | All critical pitfalls backed by official documentation or well-established patterns. Legal AI hallucination risk is well-documented in 2026 literature. |

**Overall confidence:** HIGH

### Gaps to Address

- **Claude Files API beta stability:** The Files API (launched April 2025) is the recommended PDF processing path, but it is still in beta. In Phase 1, validate it against a sample of Jessica's real documents before committing. Maintain the unpdf + Tesseract.js fallback path in the design even if not built immediately.

- **Prompt engineering for voice replication:** Research recommends few-shot examples from Jessica's filed documents, but the exact prompt structure (how many examples, how formatted, how to handle edge cases) requires empirical testing. Budget prompt iteration time in Phase 2 planning.

- **Formatting spec capture:** The `docx` library can produce Jessica's exact formatting, but this requires precise measurement of her sample documents (font names and sizes, exact line spacing values, margin measurements, tab stop positions). This must be done before Phase 3 implementation begins, and requires access to her actual .docx files.

- **ARCHITECTURE.md database discrepancy:** ARCHITECTURE.md references Neon Postgres throughout its schema and scalability sections, while STACK.md recommends Turso (libSQL). Both work with Drizzle ORM and the schema is portable. The implementation should use Turso. Phase 1 planning should confirm this decision and ensure the Drizzle schema is written targeting libSQL, not Postgres dialect.

---

## Sources

### Primary (HIGH confidence)
- [Vercel Blob documentation](https://vercel.com/docs/vercel-blob) — client upload pattern, 4.5MB limit bypass
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) — timeout and body size hard limits
- [Claude Files API](https://platform.claude.com/docs/en/build-with-claude/files) — PDF processing capabilities
- [docx npm package](https://www.npmjs.com/package/docx) — version 9.6.1 (updated March 2026)
- [Auth.js Next.js reference](https://authjs.dev/reference/nextjs) — v5 Credentials provider
- [Turso + Drizzle setup](https://docs.turso.tech/sdk/ts/orm/drizzle) — official ORM integration
- [Anthropic Data Retention Policy](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) — API data deleted after 7 days, not used for training
- [shadcn/ui Tailwind v4 support](https://ui.shadcn.com/docs/tailwind-v4) — verified compatibility

### Secondary (MEDIUM confidence)
- [Briefpoint Lawyerist Review 2026](https://lawyerist.com/reviews/artificial-intelligence-in-law-firms/briefpoint-artificial-intelligence-for-lawyers/) — competitor workflow analysis, 2-4hr time savings per response set
- [unpdf vs pdf-parse vs pdfjs-dist comparison (2026)](https://www.pkgpulse.com/blog/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-parsing-extraction-nodejs-2026) — library selection rationale
- [Best Next.js Auth Solutions 2026](https://www.pkgpulse.com/blog/best-nextjs-auth-solutions-2026) — Auth.js recommendation validation
- [Serverless SQL Databases 2026](https://www.devtoolsacademy.com/blog/serverless-sql-databases/) — Turso vs Neon comparison
- [AI Hallucinations in Legal Work 2026](https://thelegalprompts.com/blog/ai-hallucinations-legal-work-avoid-sanctions-2026) — hallucination risk in legal context

### Tertiary (MEDIUM-LOW confidence)
- [Briefpoint](https://briefpoint.ai/) — competitor feature analysis (marketing claims, not independent review)
- Competitive landscape (EsquireTek, CoCounsel, Harvey, AnytimeAI, AI4Discovery) — public websites and announcements

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
