# Phase 3: PDF Parsing & Request Extraction - Research

**Researched:** 2026-04-03
**Domain:** PDF text extraction, AI-powered structured data extraction, discovery document parsing
**Confidence:** HIGH

## Summary

Phase 3 extends the existing upload pipeline (upload -> classify) to extract individual numbered requests from discovery PDFs. The primary technical challenge is reliably parsing legal document structure -- identifying request boundaries, extracting case captions, and sub-classifying document types -- using Claude's AI capabilities rather than brittle regex-based parsing.

The critical architectural decision is the extraction method. CONTEXT.md locks D-08: Claude receives the PDF directly via the Messages API for both digital and scanned PDFs. The installed `@anthropic-ai/sdk@0.82.0` supports base64 PDF documents in the standard (non-beta) `messages.create` endpoint. This means the primary path does NOT require the Files API beta -- simply base64-encode the PDF fetched from Vercel Blob and send it as a `document` content block. This handles both digital and scanned PDFs natively since Claude's PDF processing converts each page to both text and image, enabling visual understanding of scanned documents without separate OCR.

**Primary recommendation:** Use base64 PDF document blocks with Claude's standard Messages API and structured output (`output_config`) for guaranteed JSON schema compliance. No Tesseract.js, no unpdf text extraction for the extraction pipeline -- Claude handles the full PDF natively. Keep unpdf only for the existing classify.ts fast-path (first-page text for classification confidence scoring).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Extracted requests appear inline on the case detail page (`/case/[id]`), below the document list. No separate route or modal.
- **D-02:** Extraction starts automatically when a discovery_request PDF is uploaded. No manual "Extract" button for the initial extraction. Flow: upload -> classify -> extract -> display.
- **D-03:** Each request shows a truncated preview (~100 chars) with click-to-expand for full text. Keeps 33-request lists scannable.
- **D-04:** Requests are view-only. Jessica cannot edit individual request text. If extraction is wrong, she can re-extract (Re-extract button) or re-upload a better PDF.
- **D-05:** A "Generate Responses" button appears below the extracted request list, linking to Phase 4 workflow (button is present but non-functional until Phase 4).
- **D-06:** Transparent processing -- no upfront warning when a scanned PDF is detected. System attempts extraction regardless using Claude Files API. Only show an error if extraction actually fails.
- **D-07:** On extraction failure: clear, non-technical error message ("Could not extract requests from this PDF. The document may be a poor-quality scan.") with [Retry] and [Upload new] buttons. No technical jargon.
- **D-08:** Claude Files API (beta) is the primary extraction path for both digital and scanned PDFs -- eliminates Tesseract.js cold-start risk on Vercel. Maintain fallback design per STATE.md blocker.
- **D-09:** During extraction, Claude reads the case caption block from the PDF and generates a short case name (e.g., "Swan v. Dollar Tree").
- **D-10:** Auto-name only sets the case name if it's currently null -- never overwrites Jessica's manual edits.
- **D-11:** This fulfills the deferred D-10 from Phase 1 (auto-naming from PDF content).
- **D-12:** Sub-classification happens during the extraction AI call -- one call extracts discovery type, case name, and individual requests together.
- **D-13:** Discovery types: "rfp" (Requests for Production) and "interrogatory". Stored on the document record alongside the existing "complaint" / "discovery_request" classification.
- **D-14:** Jessica can override the detected discovery sub-type via dropdown, consistent with Phase 2's classification override pattern (D-06 from Phase 2).

### Claude's Discretion
- Database schema design for extracted requests (new table vs JSON field)
- Claude Files API integration details and fallback architecture
- Extraction prompt engineering and request boundary detection logic
- Loading state UI design during extraction
- Error retry logic and timeout handling

### Deferred Ideas (OUT OF SCOPE)
- PDF text extraction for complaint (for Phase 4-5 AI generation, not Phase 3)
- Request editing/deletion by Jessica -- kept view-only for Phase 3 simplicity
- Bulk re-extraction across multiple documents
- Request quality scoring or confidence per-request
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| UPLD-03 | System extracts individual numbered requests from discovery request PDF | Claude PDF document blocks + structured output extracts numbered requests as an array; stored in `extracted_requests` table |
| UPLD-04 | System handles both digital and scanned/OCR PDFs from opposing counsel | Claude's native PDF processing converts each page to text+image, handling both digital and scanned PDFs without separate OCR |
| UPLD-05 | System identifies discovery request type (RFP vs. interrogatory) from uploaded document | Single Claude call returns `discovery_type` field alongside extracted requests; stored on document record |
</phase_requirements>

## Standard Stack

### Core (Phase-Specific)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.82.0 (installed) | Claude API client with PDF support | Already installed. Supports `document` content blocks with base64 PDF source in standard `messages.create`. Also supports `output_config` for structured JSON output. |
| unpdf | 1.4.0 (installed) | Text extraction for classification fast-path | Already installed and used in `classify.ts`. Keeps the existing classify flow working. NOT needed for the extraction pipeline itself -- Claude handles PDFs natively. |
| zod | 4.3.6 (installed) | Validate Claude's structured output | Already installed. Use to define the extraction response schema and validate at runtime as a safety net alongside `output_config`. |
| drizzle-orm | 0.45.2 (installed) | Database access for new `extracted_requests` table | Already installed. Add new table to schema.ts, generate migration with drizzle-kit. |

### Key Insight: No New Dependencies Required

All libraries needed for Phase 3 are already installed. The Claude SDK's native PDF support eliminates the need for Tesseract.js, pdfjs-dist, or any OCR library. The extraction pipeline is: fetch PDF from Blob -> base64 encode -> send to Claude with structured output -> store results.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Base64 PDF (standard API) | Files API (beta) | Files API avoids re-sending PDF bytes but requires beta header and file lifecycle management. Base64 is simpler for single-use extraction. Use Files API only if PDFs are processed multiple times. |
| Structured output (`output_config`) | Manual JSON parsing from Claude response | Structured output guarantees valid JSON matching the schema via constrained decoding. No retry logic needed for malformed JSON. |
| Claude for all PDF text | unpdf for text + Claude for parsing | Separating extraction from parsing adds complexity and fails on scanned PDFs. Claude handles both in one call. |
| New `extracted_requests` table | JSON column on documents table | Separate table enables relational queries, easier updates on re-extraction, and cleaner schema for Phase 4+ when responses are linked to requests. |

## Architecture Patterns

### Recommended Project Structure Changes

```
src/
  actions/
    classify.ts          # Existing -- keep as-is
    extract.ts           # NEW: extraction server action
    documents.ts         # Extend: add updateDocumentSubType
  lib/
    db/
      schema.ts          # Extend: add extracted_requests table, discovery sub-type on documents
    extraction/
      prompt.ts          # NEW: extraction prompt template
      schema.ts          # NEW: Zod schema for Claude's structured output
  components/
    case-detail.tsx      # Extend: add extraction UI section
    extracted-requests.tsx  # NEW: request list component
drizzle/
  0001_*.sql             # NEW: migration for extracted_requests table
```

### Pattern 1: PDF-to-Claude Extraction Pipeline

**What:** Server action fetches PDF from Vercel Blob, base64-encodes it, sends to Claude with a structured output schema, and stores the parsed requests in the database.

**When to use:** Every time a discovery_request document is uploaded or re-extracted.

**Example:**

```typescript
// src/actions/extract.ts
"use server";

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { extractedRequests, documents, cases } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { extractionResponseSchema } from "@/lib/extraction/schema";

const anthropic = new Anthropic();

export async function extractRequests(documentId: string, caseId: string) {
  // 1. Get document record to find blob URL
  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, documentId),
  });
  if (!doc) throw new Error("Document not found");

  // 2. Fetch PDF from Vercel Blob and base64-encode
  const response = await fetch(doc.blobUrl);
  const buffer = await response.arrayBuffer();
  const pdfBase64 = Buffer.from(buffer).toString("base64");

  // 3. Call Claude with PDF document block + structured output
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT, // from prompt.ts
          },
        ],
      },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: EXTRACTION_JSON_SCHEMA, // matches Zod schema
      },
    },
  });

  // 4. Parse and validate response
  const responseText =
    message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = extractionResponseSchema.parse(JSON.parse(responseText));

  // 5. Store results (transactionally clear old + insert new)
  await db
    .delete(extractedRequests)
    .where(eq(extractedRequests.documentId, documentId));

  for (const req of parsed.requests) {
    await db.insert(extractedRequests).values({
      documentId,
      requestNumber: req.number,
      text: req.text,
    });
  }

  // 6. Update document sub-type
  await db
    .update(documents)
    .set({ subType: parsed.discovery_type })
    .where(eq(documents.id, documentId));

  // 7. Auto-name case if name is null (D-09, D-10)
  if (parsed.case_name) {
    const caseRecord = await db.query.cases.findFirst({
      where: eq(cases.id, caseId),
    });
    if (caseRecord && !caseRecord.name) {
      await db
        .update(cases)
        .set({ name: parsed.case_name, updatedAt: new Date() })
        .where(eq(cases.id, caseId));
    }
  }

  revalidatePath(`/case/${caseId}`);
  return { requestCount: parsed.requests.length };
}
```
Source: Anthropic official docs (https://platform.claude.com/docs/en/build-with-claude/pdf-support, https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

### Pattern 2: Structured Output Schema

**What:** JSON schema for Claude's extraction response, paired with a Zod schema for TypeScript validation.

**When to use:** Define once, use in both the API call and the response validation.

**Example:**

```typescript
// src/lib/extraction/schema.ts
import { z } from "zod";

export const extractionResponseSchema = z.object({
  discovery_type: z.enum(["rfp", "interrogatory"]),
  case_name: z.string().nullable(),
  requests: z.array(
    z.object({
      number: z.number().int().positive(),
      text: z.string(),
    })
  ),
});

export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;

// JSON Schema for output_config (must match Zod schema)
export const EXTRACTION_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    discovery_type: {
      type: "string" as const,
      enum: ["rfp", "interrogatory"],
    },
    case_name: {
      type: ["string", "null"] as const,
    },
    requests: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          number: { type: "integer" as const },
          text: { type: "string" as const },
        },
        required: ["number", "text"] as const,
        additionalProperties: false,
      },
    },
  },
  required: ["discovery_type", "case_name", "requests"] as const,
  additionalProperties: false,
};
```
Source: Anthropic structured outputs docs (https://platform.claude.com/docs/en/build-with-claude/structured-outputs)

### Pattern 3: Database Schema Extension

**What:** New `extracted_requests` table and `sub_type` column on documents.

**When to use:** Schema migration before implementing extraction logic.

**Example:**

```typescript
// Addition to src/lib/db/schema.ts
export const extractedRequests = sqliteTable("extracted_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  requestNumber: integer("request_number").notNull(),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});

// Add to documents table:
// subType: text("sub_type"), // "rfp" | "interrogatory" | null

// Add relations
export const extractedRequestsRelations = relations(
  extractedRequests,
  ({ one }) => ({
    document: one(documents, {
      fields: [extractedRequests.documentId],
      references: [documents.id],
    }),
  })
);

// Extend documentsRelations to include extracted requests
export const documentsRelations = relations(documents, ({ one, many }) => ({
  case: one(cases, {
    fields: [documents.caseId],
    references: [cases.id],
  }),
  extractedRequests: many(extractedRequests),
}));
```

### Pattern 4: Automatic Extraction Trigger

**What:** After upload and classification, if the document is a `discovery_request`, automatically trigger extraction.

**When to use:** Extend the existing `uploadAndClassify` function in `case-detail.tsx`.

**Example:**

```typescript
// In case-detail.tsx, extend uploadAndClassify:
async function uploadAndClassify(fileState: FileUploadState) {
  try {
    // ... existing upload and classify logic ...

    // After addDocument, trigger extraction if discovery_request
    if (docType === "discovery_request") {
      updateFileState(fileState.id, { status: "extracting" });
      try {
        await extractRequests(docRecord.id, caseData.id);
      } catch {
        toast.error(
          "Could not extract requests from this PDF. The document may be a poor-quality scan."
        );
      }
    }

    setPendingUploads((prev) => prev.filter((f) => f.id !== fileState.id));
    router.refresh();
  } catch {
    // ... existing error handling ...
  }
}
```

### Pattern 5: Extraction Verification UI

**What:** Inline request list below document list on case detail page, with truncated previews and expand-on-click.

**When to use:** Render for each discovery_request document that has extracted requests.

**Example:**

```typescript
// src/components/extracted-requests.tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Request = {
  id: string;
  requestNumber: number;
  text: string;
};

type Props = {
  requests: Request[];
  discoveryType: string | null;
  documentId: string;
  caseId: string;
  onReExtract: () => void;
  isExtracting: boolean;
};

export function ExtractedRequests({
  requests,
  discoveryType,
  documentId,
  caseId,
  onReExtract,
  isExtracting,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Extracted Requests
          </h3>
          {discoveryType && (
            <Badge variant="secondary">
              {discoveryType === "rfp" ? "RFP" : "Interrogatory"}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            ({requests.length})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReExtract}
          disabled={isExtracting}
        >
          <RefreshCw size={14} />
          Re-extract
        </Button>
      </div>

      <div className="mt-3 space-y-1">
        {requests.map((req) => {
          const isExpanded = expandedIds.has(req.id);
          const preview =
            req.text.length > 100
              ? req.text.slice(0, 100) + "..."
              : req.text;

          return (
            <div
              key={req.id}
              className="cursor-pointer rounded border border-border p-3"
              onClick={() => toggleExpand(req.id)}
            >
              <div className="flex items-start gap-2">
                {req.text.length > 100 ? (
                  isExpanded ? (
                    <ChevronDown size={16} className="mt-0.5 shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="mt-0.5 shrink-0" />
                  )
                ) : (
                  <div className="w-4" />
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  {req.requestNumber}.
                </span>
                <p className="text-sm text-foreground">
                  {isExpanded ? req.text : preview}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phase 4 link -- non-functional until Phase 4 */}
      <Button className="mt-4 w-full" disabled>
        Generate Responses
      </Button>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Regex-based request parsing:** Legal documents have wildly varying formats. Regex will break on edge cases (multi-line requests, sub-parts, inconsistent numbering). Use Claude's language understanding instead.
- **Separate OCR pipeline:** Do NOT build a Tesseract.js / pdfjs-dist pipeline for scanned PDFs. Claude handles scanned PDFs natively via its vision capabilities. Adding Tesseract.js wastes serverless cold-start time and adds complexity.
- **Multiple AI calls per document:** Do NOT make separate calls for classification, case name, and request extraction. D-12 mandates a single call that returns all three.
- **Storing extracted text as JSON on the document record:** This makes relational queries harder and complicates Phase 4 when responses are linked to individual requests.
- **Streaming for extraction:** Structured output with `output_config` is not compatible with streaming. Use non-streaming `messages.create` for extraction.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction for AI | Custom unpdf + regex pipeline | Claude base64 PDF document blocks | Claude understands document layout, handles scanned PDFs, identifies request boundaries semantically |
| OCR for scanned PDFs | Tesseract.js + pdfjs-dist pipeline | Claude native PDF processing | Claude converts each page to image+text internally. No separate OCR needed. |
| JSON response validation | Manual try/catch with JSON.parse | `output_config` with `json_schema` format | Constrained decoding guarantees valid JSON matching the schema. No retry logic needed. |
| Request boundary detection | Regex patterns for "REQUEST NO. X:" | Claude with structured output | Legal documents use many numbering styles. Claude understands semantic boundaries. |
| Database migrations | Manual SQL | drizzle-kit generate + migrate | Schema-as-code ensures consistency between TypeScript types and database. |

**Key insight:** The single biggest complexity in this phase -- reliably parsing numbered requests from varying legal document formats -- is solved by sending the entire PDF to Claude and letting it return structured JSON. Hand-rolling a parser would be fragile and error-prone.

## Common Pitfalls

### Pitfall 1: Vercel Serverless Function Timeout

**What goes wrong:** PDF extraction via Claude can take 15-45 seconds for large documents (33 requests, multiple pages). Default Hobby plan timeout is 10 seconds.
**Why it happens:** Fetching PDF from Blob + base64 encoding + Claude API call + database writes = significant latency.
**How to avoid:** Vercel Pro plan provides 60-second timeout (already in project constraints). Ensure the extraction server action runs as a standard serverless function, NOT an edge function. Set `maxDuration` in the route config if needed.
**Warning signs:** 504 Gateway Timeout errors on extraction.

### Pitfall 2: Base64 Encoding Doubles PDF Size

**What goes wrong:** A 20MB PDF becomes ~27MB when base64-encoded, exceeding the 32MB API request limit.
**Why it happens:** Base64 encoding adds ~33% overhead.
**How to avoid:** The existing 20MB upload limit (in `src/lib/upload.ts`) provides headroom: 20MB * 1.33 = 26.6MB, within the 32MB limit. No change needed, but document this relationship.
**Warning signs:** 413 Request Too Large errors from Claude API.

### Pitfall 3: Re-extraction Orphans Old Requests

**What goes wrong:** If Jessica re-extracts, old request records remain in the database alongside new ones.
**Why it happens:** Forgetting to delete old records before inserting new ones.
**How to avoid:** Always delete existing `extracted_requests` for the document before inserting new ones. Use a transaction or delete-then-insert pattern.
**Warning signs:** Duplicate request numbers appearing in the UI.

### Pitfall 4: Structured Output Not Available on All Models

**What goes wrong:** Using `output_config` with a model that doesn't support it causes an API error.
**Why it happens:** Structured outputs are GA on Claude Haiku 4.5, Sonnet 4.5, Opus 4.5, Sonnet 4.6, Opus 4.6. Older model identifiers may not support it.
**How to avoid:** Use a specific supported model ID (e.g., `claude-sonnet-4-5-20250514` or `claude-haiku-4-5-20241022`). Avoid using `claude-3-5-sonnet` aliases.
**Warning signs:** API error: "output_config is not supported for this model."

### Pitfall 5: Case Name Overwrite Race Condition

**What goes wrong:** If Jessica manually names a case between upload and extraction completion, the auto-name could overwrite her edit.
**Why it happens:** Extraction reads `case.name` at the start, but by the time it writes, Jessica may have changed it.
**How to avoid:** Check `case.name` is null immediately before writing (D-10). The check-then-update pattern is sufficient for a single-user app.
**Warning signs:** Jessica's manual case name disappearing after extraction completes.

### Pitfall 6: Document Type Dropdown Values Mismatch

**What goes wrong:** The existing type dropdown has "complaint" and "discovery_request". Adding sub-types ("rfp", "interrogatory") without clear UX creates confusion.
**Why it happens:** Mixing base type and sub-type in the same UI element.
**How to avoid:** Keep the base type dropdown as-is. Add the discovery sub-type as a separate badge/dropdown that only appears for discovery_request documents. Per D-14, use the same override pattern as Phase 2.
**Warning signs:** Jessica unable to understand the type system.

## Code Examples

Verified patterns from official sources:

### Sending a PDF as Base64 Document Block (Non-Beta)

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/pdf-support
// No beta header needed for base64 PDF documents
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250514",
  max_tokens: 8192,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: pdfBase64, // Buffer.from(arrayBuffer).toString("base64")
          },
        },
        {
          type: "text",
          text: "Extract the requests from this legal document.",
        },
      ],
    },
  ],
});
```

### Structured Output with JSON Schema

```typescript
// Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
// output_config is GA (no beta header needed)
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5-20250514",
  max_tokens: 8192,
  messages: [/* ... */],
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          discovery_type: { type: "string", enum: ["rfp", "interrogatory"] },
          case_name: { type: ["string", "null"] },
          requests: {
            type: "array",
            items: {
              type: "object",
              properties: {
                number: { type: "integer" },
                text: { type: "string" },
              },
              required: ["number", "text"],
              additionalProperties: false,
            },
          },
        },
        required: ["discovery_type", "case_name", "requests"],
        additionalProperties: false,
      },
    },
  },
});

// Response is guaranteed valid JSON matching the schema
const parsed = JSON.parse(response.content[0].text);
```

### Drizzle Migration Generation

```bash
# After updating schema.ts, generate a migration
npx drizzle-kit generate

# Apply the migration
npx drizzle-kit migrate
```

### Fetching PDF from Vercel Blob (Existing Pattern)

```typescript
// Source: existing classify.ts in project
// Vercel Blob private URLs are accessible via fetch from server-side
const response = await fetch(blobUrl);
const buffer = await response.arrayBuffer();
// For Claude: base64 encode
const pdfBase64 = Buffer.from(buffer).toString("base64");
// For unpdf (existing): Uint8Array
const { text } = await extractText(new Uint8Array(buffer), { mergePages: false });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tesseract.js for OCR + unpdf for text | Claude native PDF processing (base64 document blocks) | 2024 (pdfs-2024-09-25 beta), now GA | Eliminates OCR pipeline entirely. Single API call handles both digital and scanned PDFs. |
| Manual JSON.parse with retry loops | `output_config` with `json_schema` format (structured outputs) | 2025 GA | Guaranteed valid JSON via constrained decoding. No retries needed for malformed responses. |
| `output_format` parameter (beta) | `output_config.format` parameter (GA) | Late 2025 migration | Updated parameter location. Old beta header still works but new format is preferred. |
| Files API (`files-api-2025-04-14` beta) | Still beta, but base64 is GA | 2025 | For single-use PDFs, base64 is simpler than file lifecycle management. Files API useful for repeated access. |

**Deprecated/outdated:**
- `pdfs-2024-09-25` beta header: No longer needed. PDF support is GA on all active models.
- `output_format` parameter: Migrated to `output_config.format`. Old format still works during transition.
- Tesseract.js for this use case: Claude handles scanned PDFs natively via vision capabilities.

## Open Questions

1. **Model selection for extraction: Sonnet vs Haiku**
   - What we know: D-08 from CONTEXT.md mentions Claude Files API but the classify.ts already uses `claude-haiku-4-5`. Haiku is cheaper ($0.80/MTok input vs Sonnet at $3/MTok). For extraction quality on legal documents with 33+ requests, Sonnet likely produces better results.
   - What's unclear: Whether Haiku's extraction quality is sufficient for Jessica's documents.
   - Recommendation: Start with Sonnet for extraction (quality matters for legal text). Monitor cost. Haiku is adequate for the existing classification step.

2. **Claude Files API vs Base64 for the primary path**
   - What we know: D-08 references "Claude Files API" but the technical reality is that base64 PDF document blocks achieve the same result without the beta requirement. Both handle digital and scanned PDFs identically.
   - What's unclear: Whether the user specifically wants Files API file lifecycle management (upload once, reference multiple times).
   - Recommendation: Use base64 for Phase 3 (simpler, no beta dependency, PDF is processed once). The Files API can be adopted later if needed for multi-query scenarios in Phase 4+.

3. **Extraction prompt optimization**
   - What we know: Swan RFP uses "DOCUMENT REQUEST NO. X:" format with definitions/instructions before actual requests. Prompt must skip boilerplate and extract only the numbered requests.
   - What's unclear: How varied opposing counsel's document formats are in Jessica's practice.
   - Recommendation: Build the prompt for the Swan format and common federal court variations. Test with both sample PDFs. Iterate based on Jessica's feedback.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `vitest.config.ts` (exists, environment: "node") |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UPLD-03 | Extract individual numbered requests from discovery PDF | unit | `npx vitest run src/__tests__/extract.test.ts -t "extracts numbered requests" -x` | Wave 0 |
| UPLD-03 | Store extracted requests in database with correct document linkage | unit | `npx vitest run src/__tests__/extract.test.ts -t "stores requests" -x` | Wave 0 |
| UPLD-04 | Handle digital PDF (text-based) extraction without error | unit | `npx vitest run src/__tests__/extract.test.ts -t "digital PDF" -x` | Wave 0 |
| UPLD-04 | Handle scanned PDF gracefully (error message on failure, no crash) | unit | `npx vitest run src/__tests__/extract.test.ts -t "scanned PDF" -x` | Wave 0 |
| UPLD-05 | Identify discovery type as "rfp" or "interrogatory" | unit | `npx vitest run src/__tests__/extract.test.ts -t "discovery type" -x` | Wave 0 |
| UPLD-05 | Store sub-type on document record | unit | `npx vitest run src/__tests__/extract.test.ts -t "sub-type" -x` | Wave 0 |
| D-09 | Auto-name case from PDF caption when name is null | unit | `npx vitest run src/__tests__/extract.test.ts -t "auto-name" -x` | Wave 0 |
| D-10 | Do not overwrite existing case name | unit | `npx vitest run src/__tests__/extract.test.ts -t "does not overwrite" -x` | Wave 0 |
| D-04 | Re-extract replaces old requests | unit | `npx vitest run src/__tests__/extract.test.ts -t "re-extract" -x` | Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/__tests__/extract.test.ts` -- covers UPLD-03, UPLD-04, UPLD-05, D-09, D-10
- [ ] `src/__tests__/extraction-schema.test.ts` -- covers Zod schema validation for extraction response

## Project Constraints (from CLAUDE.md)

- **Tech stack:** Next.js 15.x + Vercel (locked)
- **AI:** Claude API via @anthropic-ai/sdk (locked, v0.82.0 installed)
- **Database:** Turso/libSQL + Drizzle ORM (locked, installed)
- **File storage:** Vercel Blob with private access (locked, installed)
- **Budget:** Minimize infrastructure costs -- use Sonnet for extraction, Haiku for classification
- **Security:** Confidential legal documents -- no data used for training. Claude API is ZDR-eligible for PDF support.
- **Existing patterns:** Server actions in `src/actions/`, Drizzle relations for `db.query`, CaseList as server component, Sonner toasts, Tailwind with copper #C8653A accent
- **GSD workflow:** All changes must go through GSD commands

## Sources

### Primary (HIGH confidence)

- [Anthropic PDF Support docs (GA)](https://platform.claude.com/docs/en/build-with-claude/pdf-support) -- base64 PDF document blocks, page limits, token costs, scanned PDF handling
- [Anthropic Files API docs (beta)](https://platform.claude.com/docs/en/build-with-claude/files) -- file upload, file_id references, beta header `files-api-2025-04-14`, lifecycle management
- [Anthropic Structured Outputs docs (GA)](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- `output_config` with `json_schema` format, constrained decoding, supported models
- `@anthropic-ai/sdk@0.82.0` type definitions (installed) -- verified `DocumentBlockParam`, `Base64PDFSource`, `output_config`, `beta.files`, `beta.messages` support

### Secondary (MEDIUM confidence)

- Existing codebase patterns (`classify.ts`, `cases.ts`, `documents.ts`, `schema.ts`) -- established PDF fetch, Claude API call, and database patterns
- Existing test patterns (`src/__tests__/*.test.ts`) -- Vitest with mocked db/auth/blob

### Tertiary (LOW confidence)

- Model performance for legal document extraction -- recommended Sonnet over Haiku based on general quality observations, not tested with Jessica's specific documents

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, API capabilities verified against SDK types and official docs
- Architecture: HIGH -- extends established codebase patterns (classify.ts pipeline, server actions, Drizzle schema)
- Pitfalls: HIGH -- timeout, encoding overhead, and structured output compatibility verified against official documentation
- Extraction quality: MEDIUM -- prompt engineering and model selection need validation with real documents

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable -- core APIs are GA, not fast-moving)
