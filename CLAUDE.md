<!-- GSD:project-start source:PROJECT.md -->
## Project

**Discovery Response Drafter**

A web tool where plaintiff's civil rights attorney Jessica Massimi uploads opposing counsel's discovery requests and the complaint, and the AI generates a fully formatted Word document draft response in her voice — ready for her to review, edit, and file. Built specifically for her civil rights litigation practice, trained on her exact templates, objection language, and writing style.

**Core Value:** Eliminate the blank page problem for discovery responses — the hardest, most time-consuming part of Jessica's practice — so she starts from a quality draft instead of scratch.

### Constraints

- **Tech stack**: Next.js + Vercel — developer's preferred stack
- **AI**: Claude API for document generation
- **Auth**: Simple email/password for v1 (Jessica only)
- **File format**: Must output .docx matching her existing formatting (font, spacing, margins)
- **PDF parsing**: Must handle scanned PDFs from opposing counsel (OCR may be needed)
- **Security**: Confidential legal documents — HTTPS, no data used for training, secure file handling
- **Budget**: Solo developer, minimize infrastructure costs (Vercel free/pro tier, Claude API usage-based)
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Framework
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 15.x (stable) | Full-stack framework | Developer's preferred stack. Constraint from PROJECT.md. 15.x is current stable with App Router, Server Components, Server Actions. Next.js 16 exists but 15.x is mature and battle-tested on Vercel. | HIGH |
| React | 19.x | UI library | Ships with Next.js 15. Server Components reduce client bundle. | HIGH |
| TypeScript | 5.x | Type safety | Non-negotiable for a project handling legal documents. Catches bugs at compile time, improves AI code generation quality. | HIGH |
| Tailwind CSS | 4.x | Styling | CSS-first configuration (no tailwind.config.js needed). Native in Next.js 15 setup. Fast prototyping for a solo developer. | HIGH |
| shadcn/ui | latest | Component library | Not a dependency -- copies components into your project. Full control over styling. Has the split-pane, table, dialog, and form components needed for the review UI. Supports Tailwind v4. | HIGH |
### AI Integration
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @anthropic-ai/sdk | latest (0.39.x+) | Claude API client | Official TypeScript SDK. Handles auth, streaming, retries, typed responses. Constraint from PROJECT.md: Claude is the AI provider. | HIGH |
| Claude 3.5 Sonnet / Claude 4 Sonnet | latest available | Document generation model | Best cost-to-quality ratio for structured document generation. Haiku for extraction if cost becomes a concern, but Sonnet's quality matters for legal language. | MEDIUM |
### PDF Processing
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| unpdf | 0.11.x | Text extraction from digital PDFs | Modern, TypeScript-first, ESM-native. Works in Node.js and edge runtimes. Wraps pdf.js with a clean API. Lighter and more actively maintained than the legacy pdf-parse (which is effectively unmaintained). | MEDIUM |
| Tesseract.js | 5.x+ | OCR for scanned PDFs | Pure JS OCR engine -- no native dependencies, deploys anywhere including Vercel serverless. Opposing counsel sends scanned PDFs; OCR is a hard requirement. | HIGH |
| pdfjs-dist | 4.x | PDF page-to-image conversion | Required intermediary: Tesseract.js cannot read PDFs directly. Use pdfjs-dist to render each page to a canvas/image, then feed to Tesseract. Only needed for the OCR pipeline. | HIGH |
### Word Document Generation
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| docx | 9.6.x | .docx file generation | Declarative TypeScript API for programmatic Word document creation. Full control over fonts, margins, spacing, paragraph styles, numbering -- critical for matching Jessica's exact formatting. Actively maintained (updated March 2026). 463 dependents in npm ecosystem. | HIGH |
### Database
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Turso (libSQL) | latest | Persistent storage | SQLite-compatible, generous free tier (9GB storage, 500M reads/month). Edge-replicated for low latency. Local development uses a plain SQLite file -- no Docker, no cloud connection needed. Perfect for a solo-developer budget-conscious project. | HIGH |
| Drizzle ORM | latest | Database access layer | TypeScript-first, SQL-like query builder. Excellent Turso/libSQL support. Lightweight (no Prisma-style engine binary). Schema-as-code with migrations via drizzle-kit. | HIGH |
| @libsql/client | latest | Turso client driver | Required by Drizzle for Turso connectivity. | HIGH |
### File Storage
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel Blob | latest | PDF and DOCX file storage | Native Vercel integration. Client-side uploads bypass the 4.5MB serverless body limit. Cost-efficient for document storage (~$16/month at heavy usage). Supports private access mode for confidential legal documents. | HIGH |
### Authentication
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Auth.js (NextAuth v5) | 5.x (beta, production-stable) | Authentication | Industry standard for Next.js auth. Use Credentials provider with a single hashed password stored in env vars or database. Cookie-based sessions -- no external auth service cost. Middleware-based route protection. | MEDIUM |
### Infrastructure
| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Vercel | Pro plan | Hosting & deployment | Constraint from PROJECT.md. Git-push deploys, preview environments, serverless functions, edge network. Pro plan ($20/month) needed for: higher serverless execution limits (60s vs 10s on Hobby -- PDF OCR needs this), more Blob storage, and commercial use. | HIGH |
| Vercel Functions | Node.js 20 runtime | API routes & processing | Server-side PDF parsing, Claude API calls, DOCX generation. Use 60s timeout (Pro plan) for OCR-heavy documents. | HIGH |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 3.x | Schema validation | Validate all API inputs, form data, Claude API responses. Use everywhere. |
| react-hook-form | 7.x | Form management | Upload forms, review/edit UI, login form. |
| lucide-react | latest | Icons | Consistent icon set, works with shadcn/ui. |
| bcryptjs | 2.x | Password hashing | Auth -- hash Jessica's password. Pure JS, no native deps. |
| sonner | latest | Toast notifications | Upload progress, generation status, error feedback. Ships with shadcn/ui. |
### Dev Dependencies
| Library | Version | Purpose |
|---------|---------|---------|
| drizzle-kit | latest | Database migrations and studio |
| eslint | 9.x | Linting (ships with Next.js) |
| prettier | 3.x | Code formatting |
| prettier-plugin-tailwindcss | latest | Auto-sort Tailwind classes |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| PDF parsing | unpdf | pdf-parse | pdf-parse is unmaintained (last meaningful update years ago). unpdf is the modern replacement with TypeScript and ESM support. |
| PDF parsing | unpdf + Tesseract.js | Cloud OCR (AWS Textract, Google Vision) | Cloud OCR adds cost per page, vendor dependency, and latency. Tesseract.js runs locally in the serverless function. Quality is sufficient for typed legal documents. |
| Word generation | docx | docxtemplater | Template approach doesn't fit AI-generated variable-length content. docx gives programmatic control. docxtemplater's best features are paid modules. |
| Database | Turso + Drizzle | Vercel Postgres (Neon) | Neon free tier is only 0.5GB vs Turso's 9GB. Turso has better local dev story (plain SQLite file). Cost scales better. |
| Database | Turso + Drizzle | Prisma | Prisma requires a query engine binary (adds cold start time on serverless), generates types differently. Drizzle is lighter and more SQL-transparent. |
| Auth | Auth.js | Clerk | Clerk costs money, adds external dependency. Single user doesn't need managed auth. |
| Auth | Auth.js | Better Auth | Newer, smaller ecosystem. Auth.js has 2.5M weekly downloads and years of Next.js integration. Lower risk. |
| UI | shadcn/ui + Tailwind | Material UI, Chakra UI | shadcn/ui gives component ownership (no version lock-in), smaller bundles, Tailwind-native. MUI/Chakra add heavy runtime CSS-in-JS. |
| File storage | Vercel Blob | AWS S3 | Vercel Blob is simpler (native integration, no AWS config). S3 is overkill for a single-tenant legal app. |
| Framework | Next.js 15 | Next.js 16 | 16 is newer but 15.x is more battle-tested with current library ecosystem. Upgrade later when 16 matures. |
## What NOT to Use
| Technology | Why Not |
|------------|---------|
| LangChain / LlamaIndex | Unnecessary abstraction layer. Direct Claude SDK calls are simpler, more debuggable, and give full control over prompts. This app has a straightforward prompt pipeline, not a complex RAG system. |
| Prisma | Query engine binary bloats serverless functions and increases cold starts. Drizzle is lighter and more appropriate for SQLite/Turso. |
| MongoDB / DynamoDB | Relational data (cases have requests, requests have responses). SQL is the right model. |
| pdf-parse | Unmaintained. unpdf is the successor. |
| html-docx-js / html-to-docx | Convert HTML to DOCX -- lossy conversion, poor formatting control. Use docx library for pixel-perfect output matching Jessica's templates. |
| Electron / desktop app | Web app constraint from PROJECT.md. Jessica works on desktop but doesn't need a native app. |
| Redis / caching layer | Premature optimization. Single user, low traffic. Add later only if needed. |
| tRPC | Overkill for this app's API surface. Next.js Server Actions + Route Handlers are sufficient. |
## Installation
# Create Next.js project
# Core dependencies
# Database
# Auth & validation
# UI
# File storage
# Dev dependencies
## Environment Variables
# AI
# Database
# Auth
# File storage
# App
## Version Verification Notes
| Technology | Claimed Version | Verification Source | Date Checked |
|------------|----------------|---------------------|--------------|
| Next.js | 15.x stable | nextjs.org, releasebot.io | 2026-03-29 |
| docx | 9.6.1 | npmjs.com/package/docx | 2026-03-29 |
| unpdf | 0.11.x | npmjs.com, pkgpulse.com comparison | 2026-03-29 |
| @anthropic-ai/sdk | 0.39.x+ | npmjs.com, platform.claude.com | 2026-03-29 |
| shadcn/ui + Tailwind v4 | Supported | ui.shadcn.com/docs/tailwind-v4 | 2026-03-29 |
| Auth.js | v5 (beta, production-usable) | authjs.dev, multiple guides | 2026-03-29 |
| Turso free tier | 9GB storage, 500M reads | vercel.com/marketplace, turso docs | 2026-03-29 |
| Vercel serverless body limit | 4.5MB | vercel.com/docs/limits | 2026-03-29 |
| Vercel Pro plan | $20/month, 60s function timeout | vercel.com/docs/limits | 2026-03-29 |
## Sources
- [Next.js 15 Release](https://nextjs.org/blog/next-15)
- [Next.js Current Version March 2026](https://www.abhs.in/blog/nextjs-current-version-march-2026-stable-release-whats-new)
- [unpdf vs pdf-parse vs pdfjs-dist (2026)](https://www.pkgpulse.com/blog/unpdf-vs-pdf-parse-vs-pdfjs-dist-pdf-parsing-extraction-nodejs-2026)
- [7 PDF Parsing Libraries for Node.js](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025)
- [docx npm package](https://www.npmjs.com/package/docx)
- [docx.js documentation](https://docx.js.org/)
- [Tesseract.js](https://tesseract.projectnaptha.com/)
- [@anthropic-ai/sdk on npm](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [Anthropic Client SDKs](https://platform.claude.com/docs/en/api/client-sdks)
- [Vercel Blob documentation](https://vercel.com/docs/vercel-blob)
- [Vercel Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- [Vercel limits](https://vercel.com/docs/limits)
- [Vercel body size limit workaround](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)
- [Auth.js Next.js reference](https://authjs.dev/reference/nextjs)
- [shadcn/ui Tailwind v4 support](https://ui.shadcn.com/docs/tailwind-v4)
- [Turso + Drizzle setup](https://docs.turso.tech/sdk/ts/orm/drizzle)
- [Drizzle ORM SQLite docs](https://orm.drizzle.team/docs/get-started-sqlite)
- [Drizzle + Turso Next.js guide](https://patelvivek.dev/blog/drizzle-turso-nextjs)
- [Best Next.js Auth Solutions 2026](https://www.pkgpulse.com/blog/best-nextjs-auth-solutions-2026)
- [Serverless SQL Databases 2026](https://www.devtoolsacademy.com/blog/serverless-sql-databases/)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
