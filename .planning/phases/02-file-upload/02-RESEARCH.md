# Phase 2: File Upload - Research

**Researched:** 2026-04-01
**Domain:** File upload, blob storage, AI classification, case CRUD
**Confidence:** HIGH

## Summary

Phase 2 transforms the existing upload zone shell into a functional file upload system backed by Vercel Blob storage. Files upload directly from the browser to Vercel Blob (bypassing the 4.5MB serverless body limit), are classified by Claude Haiku as "complaint" or "discovery_request", and are linked to case records in the Turso database. The phase also adds case CRUD operations, a case list on the dashboard, and a case detail page at `/case/[id]`.

The existing codebase provides strong foundations: the `UploadZoneShell` component has drag-and-drop handlers ready for extension, the `cases` and `documents` database tables are already defined with the correct schema, and the auth system provides session-based user identification for secure upload token generation.

**Primary recommendation:** Use `@vercel/blob` client-side `upload()` with `onUploadProgress` for real-time progress bars, `handleUpload()` server route with auth gating via `onBeforeGenerateToken`, and `@anthropic-ai/sdk` with `claude-haiku-4-5` for lightweight file classification. Use server actions for all case/document CRUD operations.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Single multi-file drop zone. Jessica drops or selects one or more PDFs at once.
- D-02: Discovery request is the only required file. Complaint is optional.
- D-03: Case is auto-created on first file upload. No separate "create case" step.
- D-04: Jessica can add more files to an existing case at any time.
- D-05: AI auto-detect using Claude. Extract first page text from each PDF, send to Claude for classification as "complaint" or "discovery_request".
- D-06: Classification result shown to Jessica with ability to override via dropdown if wrong.
- D-07: Cost ~$0.01/classification, 1-3 seconds per file. Use Claude Haiku for this lightweight task.
- D-08: Inline file list below the drop zone. Each file shows: filename, upload progress bar, detected type, and status.
- D-09: Files upload directly to Vercel Blob via client-side upload.
- D-10: After all files are processed, a "Create Case" button appears.
- D-11: Dedicated `/case/[id]` route.
- D-12: Case detail shows: case name (editable), document list with types, upload date, action buttons.
- D-13: Actions: rename case, delete case (with confirmation), add more documents, remove individual documents.
- D-14: Recent cases section below upload zone on dashboard.
- D-15: Click a case row to navigate to `/case/[id]`.
- D-16: Case name is initially null/auto-populated in Phase 3.

### Claude's Discretion
- Upload progress bar styling and animation
- Exact error states for failed uploads (retry UX)
- Case list sorting (most recent first is sensible default)
- File size validation UX (20MB limit per the existing shell)
- Classification confidence display (if any)

### Deferred Ideas (OUT OF SCOPE)
- PDF text extraction and parsing -- Phase 3
- Auto-naming cases from PDF content -- Phase 3
- AI generation of discovery responses -- Phase 4+
- Bulk case operations -- not currently planned

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPLD-01 | User can upload discovery request PDFs via drag-and-drop or file picker | Vercel Blob client-side `upload()` function with `onUploadProgress` callback; extend existing `UploadZoneShell` with `multiple` attribute and file handling |
| UPLD-02 | User can upload complaint PDF for case context | Same upload flow; `documents.type` field distinguishes "complaint" from "discovery_request"; Claude Haiku auto-classifies with user override |
| UPLD-06 | Uploaded files are stored securely with no data used for model training | Vercel Blob `access: 'private'` mode; `onBeforeGenerateToken` auth gating; `maximumSizeInBytes` enforcement server-side; Anthropic API does not train on API inputs by default |

</phase_requirements>

## Standard Stack

### Core (new dependencies for Phase 2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @vercel/blob | 2.3.2 | File storage & client upload | Official Vercel Blob SDK. Client-side `upload()` bypasses 4.5MB body limit. `handleUpload()` server helper manages token exchange. `onUploadProgress` provides real-time progress. `del()` for cleanup. Private access mode for confidential legal docs. |
| @anthropic-ai/sdk | 0.81.0 | Claude API for classification | Official TypeScript SDK. Use `claude-haiku-4-5` model for lightweight, fast, cheap classification (~$0.01/call). Already a project constraint in CLAUDE.md. |

### Existing (already installed, used in Phase 2)

| Library | Version | Purpose |
|---------|---------|---------|
| drizzle-orm | 0.45.2 | Database queries for case/document CRUD |
| next-auth | 5.0.0-beta.30 | Session auth for upload token gating |
| zod | 4.3.6 | Input validation for server actions |
| lucide-react | 1.7.0 | Icons (FileText, Check, Loader2, AlertCircle, ArrowLeft, Plus, Trash2, MoreVertical) |
| react-hook-form | 7.72.0 | Available but not needed -- Phase 1 used useActionState pattern |

### shadcn/ui Components (to install)

| Component | Purpose |
|-----------|---------|
| card | Case detail document list container |
| badge | File type classification display |
| select | Type override dropdown |
| progress | Upload progress bars |
| dialog (alert-dialog) | Delete case confirmation |
| skeleton | Classification loading state |
| dropdown-menu | File row action menu |

Already installed from Phase 1: button, input, separator, sonner.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vercel Blob client upload | Server-side upload via `put()` | Server upload hits 4.5MB body limit. Client upload is required for legal PDFs which can be large. |
| Claude Haiku for classification | Regex/keyword matching | Keywords are brittle. Claude Haiku is $0.01/call and handles edge cases. User decision D-05 locks this. |
| Server actions for CRUD | API route handlers | Server actions are simpler for mutations, colocate with components, handle revalidation. Use API route only for `handleUpload` (required by Vercel Blob SDK). |

**Installation:**
```bash
npm install @vercel/blob @anthropic-ai/sdk
npx shadcn@latest add card badge select progress alert-dialog skeleton dropdown-menu
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (protected)/
      dashboard/
        page.tsx              # Updated: add case list, wire upload zone
      case/
        [id]/
          page.tsx            # NEW: case detail page
    api/
      upload/
        route.ts              # NEW: handleUpload server route for Vercel Blob
  actions/
    cases.ts                  # NEW: server actions for case CRUD
    documents.ts              # NEW: server actions for document CRUD
    classify.ts               # NEW: server action for Claude classification
  components/
    upload-zone.tsx           # REPLACE: extend UploadZoneShell with full upload logic
    file-list.tsx             # NEW: inline file list with progress/status
    file-row.tsx              # NEW: individual file row component
    case-list.tsx             # NEW: recent cases list (used on dashboard)
    case-detail.tsx           # NEW: case detail page content
    sidebar-nav.tsx           # UPDATED: render real case entries
  lib/
    db/
      schema.ts               # EXISTING: cases + documents tables (no changes needed)
      index.ts                # EXISTING: db connection
    upload.ts                 # NEW: upload utility functions (file validation, etc.)
```

### Pattern 1: Vercel Blob Client Upload Flow

**What:** Browser uploads files directly to Vercel Blob, secured by server-issued tokens.
**When to use:** All file uploads in this application.

```typescript
// Client side: src/components/upload-zone.tsx
import { upload } from '@vercel/blob/client';
import type { PutBlobResult } from '@vercel/blob';

async function uploadFile(file: File): Promise<PutBlobResult> {
  const blob = await upload(file.name, file, {
    access: 'private',
    handleUploadUrl: '/api/upload',
    multipart: true,  // Handles large files reliably
    onUploadProgress: ({ loaded, total, percentage }) => {
      setProgress(percentage);
    },
  });
  return blob;
}
```

```typescript
// Server side: src/app/api/upload/route.ts
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  const jsonResponse = await handleUpload({
    body,
    request,
    onBeforeGenerateToken: async (pathname) => {
      const session = await auth();
      if (!session?.user?.id) throw new Error('Not authenticated');
      return {
        allowedContentTypes: ['application/pdf'],
        maximumSizeInBytes: 20 * 1024 * 1024, // 20MB
        addRandomSuffix: true,
        tokenPayload: JSON.stringify({ userId: session.user.id }),
      };
    },
    onUploadCompleted: async ({ blob, tokenPayload }) => {
      // Note: This callback does NOT work in local dev without ngrok
      // Database linking is handled separately via server action
      console.log('Upload completed:', blob.url);
    },
  });
  return NextResponse.json(jsonResponse);
}
```

**Source:** [Vercel Blob Client Upload Docs](https://vercel.com/docs/vercel-blob/client-upload)

### Pattern 2: Claude Haiku Classification

**What:** Send first-page text to Claude Haiku for document type classification.
**When to use:** After each file uploads to Vercel Blob, before case creation.

```typescript
// src/actions/classify.ts
"use server";

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

export async function classifyDocument(firstPageText: string): Promise<{
  type: "complaint" | "discovery_request";
  confidence: number;
}> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 100,
    messages: [{
      role: "user",
      content: `Classify this legal document as either "complaint" or "discovery_request" (which includes requests for production, interrogatories, requests for admission, etc.).

Return ONLY a JSON object: {"type": "complaint" | "discovery_request", "confidence": 0-1}

Document text:
${firstPageText}`
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return JSON.parse(text);
}
```

**Source:** [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript), [Claude Haiku 4.5](https://www.anthropic.com/claude/haiku)

### Pattern 3: Server Actions for Case CRUD

**What:** Use Next.js server actions for all database mutations with `revalidatePath`.
**When to use:** Case creation, renaming, deletion, document removal.

```typescript
// src/actions/cases.ts
"use server";

import { db } from "@/lib/db";
import { cases, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { del } from "@vercel/blob";

export async function createCase(documentData: {
  blobUrl: string;
  filename: string;
  type: string;
  mimeType: string;
}[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  const caseRecord = await db.insert(cases).values({
    userId: session.user.id,
    name: null, // Auto-populated in Phase 3
  }).returning();

  for (const doc of documentData) {
    await db.insert(documents).values({
      caseId: caseRecord[0].id,
      ...doc,
    });
  }

  revalidatePath("/dashboard");
  return caseRecord[0];
}
```

### Pattern 4: Extracting First Page Text for Classification

**What:** Use `unpdf` to extract text from the first page of a PDF for classification.
**When to use:** After file uploads to Vercel Blob, before sending to Claude.

Note: The project has `unpdf` in its tech stack for Phase 3. For Phase 2 classification, there are two approaches:

**Option A (Recommended): Server-side extraction using unpdf**
```typescript
import { extractText } from 'unpdf';

async function getFirstPageText(blobUrl: string): Promise<string> {
  const response = await fetch(blobUrl);
  const buffer = await response.arrayBuffer();
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: false });
  return text[0] || ''; // First page only
}
```

**Option B: Client-side extraction before upload**
Extract text on the client using pdfjs-dist before the file reaches the server. Adds complexity and bundle size. Not recommended.

**Decision:** Use Option A. The server action fetches the blob, extracts first-page text via unpdf, and sends to Claude. This keeps the client simple and avoids shipping a PDF parser to the browser.

Note: `unpdf` is not yet installed. It should be added in Phase 2 since classification depends on text extraction.

### Anti-Patterns to Avoid
- **Uploading through server actions:** Server actions have the 4.5MB body limit. Always use the Vercel Blob client-side `upload()`.
- **Skipping auth in onBeforeGenerateToken:** Without auth checks, anyone can upload to your Blob store. Always verify session.
- **Using onUploadCompleted for database writes in local dev:** This callback requires Vercel's infrastructure to call back to your server. It does NOT work on localhost without ngrok. Handle database operations via a separate server action called after `upload()` resolves on the client.
- **Blocking UI on classification:** Upload and classification should be visually sequential per file but non-blocking for additional files. Upload all files in parallel, classify each as its upload completes.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload to cloud storage | Custom multipart upload with presigned URLs | `@vercel/blob` `upload()` | Handles chunking, retries, progress tracking, token exchange. Edge cases around large files, network interruption, content type validation. |
| Upload authentication | Custom token generation | `handleUpload` + `onBeforeGenerateToken` | Vercel Blob SDK handles the full token lifecycle. Just add your auth check. |
| PDF text extraction | Custom PDF parser | `unpdf` `extractText()` | PDF parsing is notoriously complex (encoding, font mapping, layout detection). unpdf wraps pdfjs with clean TypeScript API. |
| Document classification | Keyword matching / regex | Claude Haiku API | Legal documents vary widely in format. AI classification handles edge cases that rules cannot. |
| Progress tracking | XHR with manual progress events | `onUploadProgress` callback | Built into `@vercel/blob` client upload. Returns `{loaded, total, percentage}`. |
| File type validation | `file.type` check only | Server-side `allowedContentTypes` in `onBeforeGenerateToken` | Client-side MIME type can be spoofed. Server-side enforcement is the security boundary. |

**Key insight:** Vercel Blob's client upload SDK handles the hardest parts (token exchange, chunking, progress, retries). The classification problem is well-suited to Claude Haiku -- it costs pennies and handles document variety that rules-based approaches cannot.

## Common Pitfalls

### Pitfall 1: onUploadCompleted Does Not Work Locally
**What goes wrong:** Developers expect `onUploadCompleted` to fire during local development. It never does -- Vercel's infrastructure needs to reach your server via a public URL.
**Why it happens:** The callback is triggered by Vercel's servers, not the browser. Localhost is unreachable.
**How to avoid:** Do NOT rely on `onUploadCompleted` for critical logic (database writes, classification). Instead, after `upload()` resolves on the client, call a server action to save the document record and trigger classification. Use `onUploadCompleted` only as a nice-to-have confirmation in production.
**Warning signs:** Database records not appearing after upload in dev mode.

### Pitfall 2: Race Condition Between Upload and Case Creation
**What goes wrong:** If files upload in parallel but "Create Case" is clicked before all uploads finish, some documents may not be linked.
**Why it happens:** Async operations complete at different times.
**How to avoid:** Track upload state per file. Disable "Create Case" button until all files are in "done" or "error" state. The UI spec already specifies this.
**Warning signs:** Case created with fewer documents than uploaded.

### Pitfall 3: Client-Side File Validation Is Not Enough
**What goes wrong:** Relying only on `accept=".pdf"` and client-side size checks. Users can bypass these.
**Why it happens:** HTML attributes are suggestions, not enforcement.
**How to avoid:** Use `allowedContentTypes: ['application/pdf']` and `maximumSizeInBytes: 20 * 1024 * 1024` in `onBeforeGenerateToken`. The server rejects invalid files.
**Warning signs:** Non-PDF files appearing in Blob storage.

### Pitfall 4: Blob URL Stored But Blob Deleted (Orphaned References)
**What goes wrong:** If a case or document is deleted from the database but the Blob is not cleaned up, storage costs accumulate. Conversely, if only the Blob is deleted, the database has dangling references.
**Why it happens:** Two systems (database + blob store) must stay in sync.
**How to avoid:** When deleting a document, always call `del(blobUrl)` from `@vercel/blob` AND delete the database record. When deleting a case, iterate through all documents and delete their blobs first.
**Warning signs:** Growing Blob storage with no corresponding database records.

### Pitfall 5: Classification Failing Silently
**What goes wrong:** Claude API call fails (rate limit, network, invalid response) and the file appears stuck in "classifying" state.
**Why it happens:** No error handling around the classification step.
**How to avoid:** Wrap classification in try/catch. On failure, show "Could not detect file type. Select type manually." per the UI spec. Default to a reasonable fallback (let user pick manually).
**Warning signs:** Files stuck in "Classifying..." state indefinitely.

### Pitfall 6: Drizzle SQLite returning() Not Supported
**What goes wrong:** Using `.returning()` with Drizzle + libSQL/SQLite may not work as expected in all cases.
**Why it happens:** SQLite has limited `RETURNING` clause support compared to PostgreSQL.
**How to avoid:** Drizzle ORM does support `.returning()` for SQLite `INSERT` operations. Verify this works in tests. If issues arise, insert then query by ID.
**Warning signs:** Empty array returned from insert operations.

## Code Examples

### Client-Side Upload with Progress Tracking
```typescript
// Source: Vercel Blob SDK docs + project patterns
import { upload } from '@vercel/blob/client';

type FileUploadState = {
  file: File;
  status: 'uploading' | 'classifying' | 'done' | 'error';
  progress: number;
  blobUrl?: string;
  type?: 'complaint' | 'discovery_request';
  error?: string;
};

async function handleFiles(files: FileList) {
  const validFiles = Array.from(files).filter(f => {
    if (f.type !== 'application/pdf') return false;
    if (f.size > 20 * 1024 * 1024) return false;
    return true;
  });

  // Upload each file in parallel
  const uploads = validFiles.map(async (file) => {
    const state: FileUploadState = { file, status: 'uploading', progress: 0 };

    try {
      const blob = await upload(file.name, file, {
        access: 'private',
        handleUploadUrl: '/api/upload',
        multipart: true,
        onUploadProgress: ({ percentage }) => {
          state.progress = percentage;
          // Update React state here
        },
      });

      state.blobUrl = blob.url;
      state.status = 'classifying';

      // Call server action for classification
      const result = await classifyDocument(blob.url);
      state.type = result.type;
      state.status = 'done';
    } catch (error) {
      state.status = 'error';
      state.error = error instanceof Error ? error.message : 'Upload failed';
    }

    return state;
  });
}
```

### Deleting a Case with Blob Cleanup
```typescript
// Source: Vercel Blob SDK + Drizzle ORM patterns
"use server";

import { db } from "@/lib/db";
import { cases, documents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function deleteCase(caseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  // Fetch all documents to get blob URLs
  const docs = await db.query.documents.findMany({
    where: eq(documents.caseId, caseId),
  });

  // Delete blobs
  if (docs.length > 0) {
    await del(docs.map(d => d.blobUrl));
  }

  // Delete case (cascades to documents via schema)
  await db.delete(cases).where(eq(cases.id, caseId));

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
```

### Sidebar Case List Query
```typescript
// Source: Drizzle ORM + existing auth pattern
import { db } from "@/lib/db";
import { cases, documents } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function getCasesWithDocCount(userId: string) {
  const result = await db
    .select({
      id: cases.id,
      name: cases.name,
      createdAt: cases.createdAt,
      docCount: sql<number>`count(${documents.id})`,
    })
    .from(cases)
    .leftJoin(documents, eq(documents.caseId, cases.id))
    .where(eq(cases.userId, userId))
    .groupBy(cases.id)
    .orderBy(desc(cases.createdAt))
    .limit(10);

  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side upload with `put()` | Client-side upload with `upload()` from `@vercel/blob/client` | Always recommended for >4.5MB | Required for legal PDFs that can exceed serverless body limit |
| `pdf-parse` for text extraction | `unpdf` | 2024+ | TypeScript-first, ESM-native, actively maintained |
| Claude 3 Haiku | Claude Haiku 4.5 (`claude-haiku-4-5`) | 2025 | Better classification accuracy, same low cost |
| Custom auth token generation | `handleUpload` with `onBeforeGenerateToken` | Vercel Blob SDK standard | Handles token lifecycle automatically |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @vercel/blob | File upload/storage | Needs install | 2.3.2 (npm latest) | -- |
| @anthropic-ai/sdk | Classification | Needs install | 0.81.0 (npm latest) | -- |
| unpdf | Text extraction for classification | Needs install | 0.11.x (npm latest) | -- |
| BLOB_READ_WRITE_TOKEN | Vercel Blob auth | Not set | -- | Must create Blob store in Vercel dashboard |
| ANTHROPIC_API_KEY | Claude API auth | Not set | -- | Must add to .env.local |
| Vercel Blob store | File storage | Not provisioned | -- | Must create via Vercel dashboard |

**Missing dependencies with no fallback:**
- `BLOB_READ_WRITE_TOKEN` -- required for Vercel Blob. Must provision a Blob store via Vercel dashboard and pull env vars.
- `ANTHROPIC_API_KEY` -- required for Claude classification. Must add API key.

**Missing dependencies with fallback:**
- For local development without ngrok: `onUploadCompleted` callback will not fire. Use client-side post-upload server action calls instead (this is the recommended pattern regardless).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (exists, environment: node) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UPLD-01 | Upload PDF via drag-and-drop or file picker, stored in Vercel Blob | integration | `npx vitest run src/__tests__/upload.test.ts -t "UPLD-01" --reporter=verbose` | No -- Wave 0 |
| UPLD-02 | Upload complaint PDF for case context | integration | `npx vitest run src/__tests__/upload.test.ts -t "UPLD-02" --reporter=verbose` | No -- Wave 0 |
| UPLD-06 | Files stored securely, not used for training | unit | `npx vitest run src/__tests__/upload-security.test.ts -t "UPLD-06" --reporter=verbose` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/upload.test.ts` -- covers UPLD-01, UPLD-02 (file upload flow, classification, case creation)
- [ ] `src/__tests__/upload-security.test.ts` -- covers UPLD-06 (auth gating, content type validation, size limits)
- [ ] `src/__tests__/cases.test.ts` -- covers case CRUD operations (create, rename, delete with blob cleanup)

Note: These will need to mock `@vercel/blob` and `@anthropic-ai/sdk` since they require external services. Vitest has built-in mocking via `vi.mock()`.

## Open Questions

1. **Local development without Vercel Blob store**
   - What we know: Vercel Blob requires a `BLOB_READ_WRITE_TOKEN` from a provisioned store. Local dev works if the token is set (uploads go to the real Blob store even locally).
   - What's unclear: Whether the developer has a Vercel project and Blob store set up yet.
   - Recommendation: The first task should include provisioning steps. Vercel Blob has no local emulator -- local dev uses the real store (free tier is generous). Add `BLOB_READ_WRITE_TOKEN` to `.env.local`.

2. **unpdf installation for Phase 2 vs Phase 3**
   - What we know: CLAUDE.md lists unpdf for Phase 3 (text extraction). But Phase 2 classification needs first-page text extraction from PDFs.
   - What's unclear: Whether unpdf should be installed now or the classification should use a simpler approach.
   - Recommendation: Install unpdf now. Classification requires text extraction. This is a natural dependency.

3. **Drizzle `.returning()` with libSQL**
   - What we know: Drizzle ORM supports `.returning()` for SQLite INSERT statements. The existing schema uses `$defaultFn` for IDs.
   - What's unclear: Whether `.returning()` works reliably with the Turso/libSQL client specifically.
   - Recommendation: Test early. If issues, generate UUID before insert and use it directly.

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Next.js 15 + Vercel (locked)
- **AI:** Claude API via `@anthropic-ai/sdk` (locked)
- **File storage:** Vercel Blob with private access (locked)
- **Database:** Turso/libSQL with Drizzle ORM (locked)
- **Auth:** Auth.js (NextAuth v5) with JWT sessions (locked)
- **UI:** shadcn/ui + Tailwind CSS v4 + Lucide icons (locked)
- **Security:** Confidential legal documents -- HTTPS, no training data exposure, auth-gated uploads
- **No LangChain/LlamaIndex:** Direct Claude SDK calls only
- **No server-side file upload through serverless functions:** Client-side upload required for >4.5MB files
- **GSD workflow:** Must use GSD commands for file changes

## Sources

### Primary (HIGH confidence)
- [Vercel Blob Client Upload Docs](https://vercel.com/docs/vercel-blob/client-upload) -- full client upload API, handleUpload, onBeforeGenerateToken, onUploadCompleted
- [Vercel Blob SDK Reference](https://vercel.com/docs/vercel-blob/using-blob-sdk) -- put(), del(), get(), list(), handleUpload options, maximumSizeInBytes, onUploadProgress
- [@vercel/blob npm](https://www.npmjs.com/package/@vercel/blob) -- version 2.3.2 verified
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk) -- version 0.81.0 verified
- Existing codebase: `src/lib/db/schema.ts`, `src/components/upload-zone-shell.tsx`, `src/lib/auth.ts`

### Secondary (MEDIUM confidence)
- [Claude Haiku 4.5](https://www.anthropic.com/claude/haiku) -- model capabilities and pricing
- [Anthropic SDK TypeScript](https://github.com/anthropics/anthropic-sdk-typescript) -- SDK usage patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified via npm registry, official docs reviewed
- Architecture: HIGH -- patterns directly from Vercel Blob official docs, adapted to project's existing patterns
- Pitfalls: HIGH -- well-documented issues in Vercel Blob docs (onUploadCompleted localhost limitation) and standard async UI patterns

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable libraries, 30-day window)
