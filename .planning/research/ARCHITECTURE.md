# Architecture Patterns

**Domain:** Legal discovery response automation (PDF intake, AI generation, review UI, Word export)
**Researched:** 2026-03-29

## Recommended Architecture

### High-Level System Overview

```
Browser (Jessica)
  |
  |-- [1] Upload PDFs (complaint + discovery requests)
  |       |
  |       v
  |   Vercel Blob (client upload, bypasses 4.5MB serverless limit)
  |       |
  |       v
  |-- [2] Parse & Extract (serverless function)
  |       |-- PDF text extraction (unpdf / pdf-parse)
  |       |-- OR send PDF directly to Claude API (Files API)
  |       |-- Extract individual requests via Claude
  |       v
  |   Neon Postgres (case state, extracted requests, generated responses)
  |       |
  |       v
  |-- [3] Generate Responses (serverless function, per-request)
  |       |-- Claude API with complaint context + templates + voice samples
  |       |-- Stream responses back, store in DB
  |       v
  |   Neon Postgres (responses stored per-request)
  |       |
  |       v
  |-- [4] Review UI (Next.js app)
  |       |-- Side-by-side: request | AI response
  |       |-- Approve / Edit / Flag per request
  |       v
  |   Neon Postgres (review state: approved/edited/flagged)
  |       |
  |       v
  |-- [5] Export (serverless function)
  |       |-- docx library generates Word document
  |       |-- Applies Jessica's formatting (font, spacing, margins)
  |       |-- Returns download URL via Vercel Blob
  |       v
  |   Browser downloads .docx
```

### Component Boundaries

| Component | Responsibility | Communicates With | Deployment |
|-----------|---------------|-------------------|------------|
| **Upload Handler** | Validate file type/size, initiate client upload to Blob, create case record | Vercel Blob, Neon DB | Next.js API route (token generation only) |
| **PDF Parser** | Extract text from uploaded PDFs, handle both digital and scanned PDFs | Vercel Blob (read), Claude API (Files API or text), Neon DB (write) | Next.js API route / Server Action |
| **Request Extractor** | Identify and split individual discovery requests from parsed text | Claude API, Neon DB | Part of Parse pipeline |
| **Response Generator** | Generate Jessica-voice responses for each extracted request | Claude API, Neon DB | Next.js API route (streaming) |
| **Review UI** | Display requests + responses side-by-side, enable edit/approve/flag | Neon DB (read/write) | Next.js RSC + Client Components |
| **Export Engine** | Assemble approved responses into formatted .docx | Neon DB (read), Vercel Blob (write .docx) | Next.js API route |
| **Auth** | Simple email/password login for Jessica | Neon DB | Next.js middleware + API routes |

## Data Flow

### Phase 1: Upload & Parse

```
1. Jessica selects complaint PDF + discovery request PDF in browser
2. Browser requests upload token from API route (authenticated)
3. Browser uploads directly to Vercel Blob (client upload, no 4.5MB limit)
4. API route creates a "case" record in Neon DB with blob URLs and status="uploaded"
5. Parse triggered: fetch PDF from Blob URL
6. OPTION A (Recommended): Send PDF to Claude API via Files API (beta)
   - Claude extracts text AND identifies individual requests in one call
   - Avoids separate OCR/parsing step entirely
   - 32MB limit, 100 page limit -- more than sufficient for discovery requests
7. OPTION B (Fallback): Use unpdf for text extraction locally
   - Works for digital PDFs; needs Tesseract.js for scanned PDFs
   - Then send extracted text to Claude to split into individual requests
8. Store extracted requests in DB: case_id, request_number, request_text
9. Update case status="parsed"
```

**Recommendation: Option A (Claude Files API).** Discovery request PDFs are typically 5-30 pages. Claude can read the PDF directly, extract text (even from scanned documents since it processes page images), and identify individual requests in a single API call. This eliminates the entire OCR/parsing complexity. The Files API is in beta but stable enough for a single-user tool. Fall back to Option B only if the Files API proves unreliable.

### Phase 2: Response Generation

```
1. For each extracted request, call Claude API with:
   - The individual request text
   - The complaint text (for case context / facts)
   - Jessica's template patterns (RFP vs interrogatory)
   - Jessica's voice samples (from benchmark documents)
   - Instruction for response type selection (produced docs / no docs exist / objection)
2. Stream each response back to the client (SSE or fetch streaming)
3. Store generated response in DB: request_id, response_text, response_type
4. Update case status="generated"
```

**Prompting Architecture:**

Use a structured system prompt with three layers:

| Layer | Content | Changes Per |
|-------|---------|-------------|
| **System prompt** | Role definition, formatting rules, Jessica's voice characteristics, objection formulas | Never (baked in) |
| **Case context** | Complaint text, case caption, party names | Per case |
| **Request context** | Individual request text, request type (RFP vs interrogatory), request number | Per request |

For RFPs (highly formulaic), batch multiple requests in a single Claude call -- they are short and responses are templated. For interrogatories (require substantive answers), process one at a time with more complaint context.

### Phase 3: Review

```
1. Review UI loads all requests + responses for a case
2. Jessica sees side-by-side view: original request | AI response
3. For each request-response pair, she can:
   - Approve (no changes needed)
   - Edit (inline text editor modifies response)
   - Flag (marks for manual rewrite, optional note)
4. All changes save to DB immediately (optimistic updates)
5. Progress indicator: "17 of 33 reviewed"
6. Case status="in_review" then "review_complete" when all addressed
```

### Phase 4: Export

```
1. Jessica clicks "Export to Word"
2. Server function reads all approved/edited responses from DB
3. Assembles document with docx library:
   - General statements boilerplate (stored as template)
   - Each request + response, numbered
   - Signature block (stored as template)
   - Formatting: font, spacing, margins matching Jessica's existing style
4. Generated .docx uploaded to Vercel Blob
5. Download URL returned to browser
6. Case status="exported"
```

## Database Schema (Neon Postgres via Drizzle ORM)

```
cases
  id            uuid PK
  title         text (e.g., "Swan v. Dollar Tree - First RFP")
  case_caption  text
  complaint_blob_url    text
  discovery_blob_url    text
  complaint_text        text (extracted)
  discovery_type        enum('rfp', 'interrogatory')
  status        enum('uploaded', 'parsing', 'parsed', 'generating', 'generated', 'in_review', 'review_complete', 'exported')
  created_at    timestamp
  updated_at    timestamp

requests
  id            uuid PK
  case_id       uuid FK -> cases
  request_number integer
  request_text  text
  created_at    timestamp

responses
  id            uuid PK
  request_id    uuid FK -> requests
  response_text text
  response_type enum('produced_docs', 'no_docs_exist', 'objection', 'substantive')
  review_status enum('pending', 'approved', 'edited', 'flagged')
  edited_text   text (nullable, only if edited)
  flag_note     text (nullable, only if flagged)
  created_at    timestamp
  updated_at    timestamp

templates
  id            uuid PK
  name          text (e.g., "general_statements", "signature_block", "rfp_system_prompt")
  content       text
  template_type enum('boilerplate', 'prompt', 'formatting')
  updated_at    timestamp
```

## Patterns to Follow

### Pattern 1: Client-Side Upload to Vercel Blob

**What:** Upload PDFs directly from the browser to Vercel Blob using presigned tokens, bypassing the 4.5MB serverless function body limit.

**Why:** Discovery request PDFs from opposing counsel can be 5-30 pages, easily exceeding 4.5MB especially if scanned. Client upload has no size limit (up to 500MB per file on Vercel Blob) and no data transfer charges.

**How:**
1. API route generates a presigned upload token (authenticated)
2. Browser uploads directly to Vercel Blob using `@vercel/blob/client`
3. `onUploadCompleted` callback creates the case record in DB with the blob URL

### Pattern 2: Claude as Primary PDF Processor

**What:** Send PDFs directly to Claude via the Files API rather than parsing them locally.

**Why:** Claude handles both digital and scanned PDFs (it converts pages to images internally). This eliminates the need for unpdf, Tesseract.js, and the complexity of OCR pipelines in serverless. One API call does extraction + request splitting.

**Confidence:** MEDIUM. The Files API is in beta (since April 2025). For a single-user internal tool, beta stability is acceptable. Monitor for GA release.

### Pattern 3: Streaming Response Generation

**What:** Stream Claude API responses to the browser in real-time using Server-Sent Events or the Vercel AI SDK's `useChat`/`useCompletion` hooks.

**Why:** Generating 33 RFP responses takes time. Streaming shows progress, keeps Jessica engaged, and avoids Vercel function timeout risks by returning data incrementally.

**Implementation:** Use the Vercel AI SDK (`ai` package) which provides React hooks for streaming and server-side stream helpers that work with Claude's API.

### Pattern 4: Optimistic Review State

**What:** Save review decisions (approve/edit/flag) immediately via optimistic UI updates, with background persistence to DB.

**Why:** Jessica will review 33+ requests in sequence. The UI must feel instant -- no waiting for DB round-trips between each review action.

### Pattern 5: Template-Based Document Assembly

**What:** Use the `docx` npm library to programmatically build Word documents matching Jessica's exact formatting.

**Why:** Jessica's output follows a rigid structure (boilerplate header, numbered request-response pairs, signature block). Programmatic generation with `docx` gives full control over fonts, spacing, margins, and numbering. Template-based approaches (docxtemplater) are better for fill-in-the-blank, but this use case needs dynamic repetition of request-response blocks.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Server-Side PDF Upload Through API Routes

**What:** Routing PDF file uploads through Next.js API routes / server actions.

**Why bad:** Hard 4.5MB request body limit on Vercel serverless functions. Discovery PDFs from opposing counsel (especially scanned) frequently exceed this.

**Instead:** Use Vercel Blob client uploads. The browser uploads directly to Blob storage; your server only handles the token generation and post-upload processing.

### Anti-Pattern 2: Local OCR Pipeline in Serverless

**What:** Running Tesseract.js or similar OCR in a Vercel serverless function.

**Why bad:** Tesseract.js requires large language data files (~15MB+), has high memory usage, and slow cold starts. Serverless functions have 250MB unzipped size limits and timeout constraints. OCR of a 20-page scanned PDF could easily timeout.

**Instead:** Send PDFs to Claude directly. Claude converts pages to images and extracts text as part of its vision capabilities. If Claude Files API is not suitable, use a dedicated OCR service (e.g., Google Document AI or AWS Textract) rather than running OCR in serverless.

### Anti-Pattern 3: Single Monolithic Generation Call

**What:** Sending all 33 requests to Claude in one API call and expecting all 33 responses back.

**Why bad:** Extremely long response, high chance of quality degradation toward the end, difficult to handle partial failures, no progress feedback.

**Instead:** Batch strategically. For RFPs (short, formulaic): batch 5-8 requests per call. For interrogatories (longer, substantive): process 1-2 per call. This balances throughput with quality.

### Anti-Pattern 4: Storing Files on the Vercel Serverless Filesystem

**What:** Writing uploaded files to /tmp for processing.

**Why bad:** Serverless functions are ephemeral. The filesystem is not shared between invocations. Files in /tmp may disappear at any time.

**Instead:** All files go to Vercel Blob. All structured data goes to Neon Postgres. The serverless function is stateless.

## Scalability Considerations

| Concern | At 1 user (Jessica) | At 10 users | At 100 users |
|---------|---------------------|-------------|--------------|
| **Database** | Neon free tier (100 CU-hours/month) | Neon Pro ($19/mo) | Neon Scale |
| **Blob storage** | Vercel Blob free tier | Vercel Blob Pro | S3 migration |
| **Claude API cost** | ~$0.50-2.00 per case (est. 33 requests) | Usage-based, manageable | Prompt caching critical |
| **Concurrent generation** | Sequential fine | Parallel per-case | Queue system needed |
| **Auth** | Single email/password | Add user table, still simple auth | Multi-tenant with proper RBAC |

For v1 (Jessica only), all free/low-cost tiers are sufficient. The architecture supports scaling to multi-tenant by adding a `user_id` column to `cases` and proper auth -- no architectural rewrites needed.

## Suggested Build Order

The following order respects component dependencies and enables incremental validation:

### Build Phase 1: Upload + Parse Pipeline
**Build:** Upload handler, Vercel Blob integration, Claude Files API parsing, request extraction
**Dependencies:** None (foundational)
**Validates:** Can we reliably extract individual requests from Jessica's real PDFs?
**Output:** Case record in DB with extracted requests visible in a basic list view

### Build Phase 2: Response Generation
**Build:** Prompting pipeline, system prompts with Jessica's voice/templates, streaming generation
**Dependencies:** Phase 1 (needs extracted requests)
**Validates:** Does Claude produce responses that match Jessica's patterns and voice?
**Output:** Generated responses stored in DB, viewable alongside requests

### Build Phase 3: Review UI
**Build:** Side-by-side review interface, approve/edit/flag workflow, progress tracking
**Dependencies:** Phase 2 (needs generated responses to review)
**Validates:** Can Jessica efficiently review and edit responses?
**Output:** Fully reviewed response set ready for export

### Build Phase 4: Export to Word
**Build:** Document assembly with `docx`, formatting to match Jessica's style, boilerplate + signature
**Dependencies:** Phase 3 (needs approved responses)
**Validates:** Does the exported .docx match Jessica's existing filed documents?
**Output:** Downloadable Word document

### Build Phase 5: Auth + Polish
**Build:** Simple authentication, error handling, loading states, edge cases
**Dependencies:** All prior phases (wraps everything)
**Validates:** Can Jessica use this end-to-end without developer assistance?
**Output:** Production-ready single-user application

**Rationale for this order:** Each phase produces a testable artifact that Jessica can validate before building the next layer. The riskiest unknowns (PDF parsing reliability, AI response quality) are addressed first. The review UI and export are lower risk -- standard CRUD and document generation.

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| File storage | Vercel Blob (client upload) | Avoids 4.5MB limit, native Vercel integration, CDN-backed |
| PDF parsing | Claude Files API (primary), unpdf (fallback) | Eliminates OCR complexity; Claude handles scanned PDFs via vision |
| Database | Neon Postgres via Drizzle ORM | Serverless Postgres, Vercel marketplace native, free tier sufficient for v1 |
| Document generation | `docx` npm library | Programmatic control over formatting; better than templates for dynamic repetition |
| AI integration | Vercel AI SDK + Claude API | Streaming support, React hooks, built for Vercel deployment |
| State management | Server-first (RSC + Server Actions) | Minimal client state; data lives in DB, rendered via Server Components |

## Sources

- [Vercel Blob Client Uploads](https://vercel.com/docs/vercel-blob/client-upload) - Official docs on client-side upload pattern
- [Vercel Blob Server Uploads](https://vercel.com/docs/vercel-blob/server-upload) - 4.5MB limit documentation
- [Vercel Functions Limitations](https://vercel.com/docs/functions/limitations) - Serverless function constraints
- [How to Bypass Vercel 4.5MB Limit](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) - Official guidance
- [Claude Files API](https://platform.claude.com/docs/en/build-with-claude/files) - Files API beta documentation
- [Claude PDF Support](https://platform.claude.com/docs/en/build-with-claude/pdf-support) - PDF processing capabilities
- [docx npm library](https://docx.js.org/) - Programmatic Word document generation
- [Neon for Vercel](https://vercel.com/marketplace/neon) - Serverless Postgres marketplace integration
- [Drizzle ORM + Neon](https://orm.drizzle.team/docs/tutorials/drizzle-with-neon) - ORM setup guide
- [7 PDF Parsing Libraries for Node.js](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) - Library comparison
- [unpdf GitHub](https://github.com/unjs/unpdf) - Modern PDF extraction library
