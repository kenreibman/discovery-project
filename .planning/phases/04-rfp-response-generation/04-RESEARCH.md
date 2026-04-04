# Phase 4: RFP Response Generation - Research

**Researched:** 2026-04-03
**Domain:** Claude API structured output + streaming, Drizzle schema extension, Next.js SSE Route Handlers, legal prompt engineering
**Confidence:** HIGH

## Summary

Phase 4 takes the extracted RFP requests from Phase 3 and generates AI draft responses for every request in a single Claude API call. The core technical challenge is designing a prompt that classifies each request into one of Jessica's four response patterns (produced all, no such documents, objection, cross-reference) while producing a structured JSON response that can be streamed to the UI and persisted to the database.

The existing codebase provides a strong foundation. Phase 3 established the Claude base64 PDF document block pattern, the dual Zod + JSON schema validation pattern, and the server action structure. Phase 4 extends this pattern but adds streaming (the extraction call was non-streaming) and a new SSE Route Handler to deliver real-time progress to the client.

**Primary recommendation:** Use a Next.js Route Handler (`/api/generate`) that creates a Claude `messages.stream()` call with `output_config` for structured JSON, pipes text deltas through SSE to the client, and persists each response to the database as it completes parsing. The `zodOutputFormat()` helper from `@anthropic-ai/sdk/helpers/zod` simplifies the existing dual-schema pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** AI uses complaint-aware classification. Both the RFP document and complaint PDF are analyzed together. The complaint context drives pattern selection: allegations in complaint -> "produced all", things plaintiff wouldn't have -> "no such documents", overly broad/privileged/premature language -> objection.
- **D-02:** Four response patterns derived from Jessica's Swan case responses:
  - **Pattern A -- "Produced all"**: `"Plaintiff has produced all such documents in his possession."` (default when documents likely exist)
  - **Pattern B -- "No such documents"**: `"No such documents exist."` or `"Plaintiff is not in possession of any such documents."` (when plaintiff clearly wouldn't have the requested items)
  - **Pattern C -- Objection**: Full objection formula + substantive follow-up. Objection types: privilege (attorney-client/work product), overbroad/irrelevant, premature, compound. Includes "Without waiving any objection..." followed by substantive partial response where appropriate.
  - **Pattern D -- Cross-reference**: `"Defendant is referred to Plaintiff's response to request no. [X] herein."` (when a later request covers the same ground as an earlier one)
- **D-03:** AI generates full objection responses including multi-paragraph substantive follow-ups (like the damages response in Swan Request 28). Not just the objection formula -- the full draft Jessica would write.
- **D-04:** AI auto-detects overlapping requests and generates cross-reference responses where appropriate.
- **D-05:** AI does NOT fabricate document existence. When uncertain, defaults to "produced all documents" (RFP-06). Never claims documents don't exist unless the request clearly asks for something the plaintiff wouldn't possess.
- **D-06:** Streaming generation -- responses stream in one at a time as Claude generates them. Jessica sees progress (e.g., "12/33 generated"). More responsive UX than waiting 60 seconds for all results.
- **D-07:** The existing disabled "Generate Responses" button (from Phase 3, D-05) becomes functional. Clicking it triggers generation for all extracted requests in the case.
- **D-08:** New `generated_responses` DB table stores responses linked to extracted requests. Responses appear inline on the case detail page. Persists across page refreshes.
- **D-09:** Full re-generate supported -- a "Re-generate" button replaces all previous responses with new ones (same pattern as re-extract in Phase 3). Old responses deleted before new ones inserted.
- **D-10:** Full complaint PDF sent alongside requests to Claude via base64 document block (same pattern as extraction). One API call receives both documents.
- **D-11:** If no complaint is uploaded, generation proceeds anyway with a limitation banner: "Responses generated without complaint context. Upload a complaint and re-generate for better results." Without complaint, AI defaults more heavily to "produced all documents" pattern.
- **D-12:** Model: Claude Sonnet (`claude-sonnet-4-5`). Best cost/quality ratio for structured legal output. Estimated ~$0.15-0.30 per generation of a 33-request set.
- **D-13:** Partial save on failure -- if generation fails partway through (e.g., API timeout), save whatever responses were generated. Show error with "Continue generation" button that picks up from where it left off. No work lost.

### Claude's Discretion
- Exact streaming implementation approach (Server-Sent Events, polling, or WebSocket)
- Database schema design for `generated_responses` table
- Prompt engineering for response quality and voice matching
- Loading/progress UX design during streaming generation
- How "Continue generation" resumes after partial failure

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RFP-01 | AI generates a response for each RFP request using Jessica's three patterns: "produced all documents," "no such documents exist," or objection with explanation | Claude structured output with four-pattern classification schema (D-02). Prompt references Jessica's exact Swan case formulas. |
| RFP-02 | AI classifies each request into the correct response pattern based on complaint context and request language | Complaint PDF sent as base64 document block alongside extracted requests (D-01, D-10). Prompt instructs classification logic. |
| RFP-03 | Objections use Jessica's exact language formulas: privilege, overbroad/irrelevant, premature, compound | Objection templates baked into system prompt verbatim from Swan case responses. Schema validates objection_type enum. |
| RFP-04 | Objection responses include "without waiving any objection" followed by a substantive partial response where appropriate | Schema requires `substantive_response` field on objection-pattern responses. Prompt explicitly requires the bridge phrase. |
| RFP-05 | All responses are generated in a single pass (full-draft-first workflow, not request-by-request) | Single Claude API call with all extracted requests + complaint. Streaming delivers responses incrementally but from one call. |
| RFP-06 | AI does not fabricate facts -- defaults to "produced all documents" when unsure whether documents exist | Prompt explicitly instructs: "When uncertain about document existence, default to Pattern A." D-05. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack**: Next.js 15.x + Vercel, React 19, TypeScript 5.x, Tailwind CSS 4.x, shadcn/ui
- **AI**: Claude API via `@anthropic-ai/sdk` (v0.82.0 installed). Model: `claude-sonnet-4-5` (D-12)
- **Database**: Turso (libSQL) + Drizzle ORM. Migrations via `drizzle-kit`
- **File storage**: Vercel Blob with private access, Bearer token auth for PDF retrieval
- **Validation**: Zod for runtime, JSON schema for Claude `output_config`
- **DO NOT USE**: LangChain, Prisma, MongoDB, pdf-parse, tRPC
- **Patterns established**: Server actions with auth guard, `router.refresh()` for UI sync, base64 PDF document blocks for Claude, dual Zod + JSON schema validation

## Standard Stack

No new dependencies required. Phase 4 uses the existing installed stack.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.82.0 | Claude API client with streaming | Already installed. Provides `messages.stream()` + `output_config` for structured streaming. `zodOutputFormat()` helper available at `@anthropic-ai/sdk/helpers/zod`. |
| drizzle-orm | 0.45.2 | Database schema + queries | Already installed. New `generatedResponses` table + relations. |
| zod | 4.3.6 | Response validation | Already installed. Define generation response schema, pass to `zodOutputFormat()`. |
| next | 15.5.14 | Route Handler for SSE | Already installed. New `/api/generate` Route Handler with `ReadableStream` for SSE. |

### Supporting (Already Installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sonner | 2.0.7 | Toast notifications | Error feedback during generation failures |
| lucide-react | 1.7.0 | Icons | Loading/progress indicators (Loader2, Check, AlertCircle) |

### No New Dependencies
This phase adds zero new npm packages. The existing `@anthropic-ai/sdk` at v0.82.0 includes all required features: `messages.stream()`, `output_config`, `zodOutputFormat()`, `toReadableStream()`, `MessageStream` event system.

## Architecture Patterns

### Recommended Project Structure
```
src/
  actions/
    generate.ts              # Server action for non-streaming trigger (delete old, start)
  app/
    api/
      generate/
        route.ts             # Route Handler: SSE stream endpoint
  lib/
    generation/
      schema.ts              # Zod schema + JSON schema for response structure
      prompt.ts              # System prompt with Jessica's exact voice/patterns
  components/
    extracted-requests.tsx    # Modified: functional Generate button, shows responses
    generated-response.tsx   # New: renders a single generated response inline
  lib/
    db/
      schema.ts              # Extended: generatedResponses table + relations
```

### Pattern 1: SSE Route Handler for Claude Streaming (RECOMMENDED)

**What:** A Next.js Route Handler at `/api/generate/route.ts` that creates a Claude `messages.stream()` call and pipes text deltas through SSE to the client.

**Why not Server Action:** Server Actions cannot stream data. They return a single value. The streaming requirement (D-06) mandates a Route Handler with `ReadableStream`.

**Implementation approach:**

```typescript
// src/app/api/generate/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro plan: 60s timeout

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { caseId, documentId } = await request.json();

  // ... fetch PDFs, build prompt ...

  const anthropic = new Anthropic();
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 16384,
    messages: [/* ... */],
    output_config: {
      format: {
        type: "json_schema",
        schema: GENERATION_JSON_SCHEMA,
      },
    },
  });

  // Convert Claude stream to SSE-formatted ReadableStream
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let fullJson = "";

      stream.on("text", (textDelta) => {
        fullJson += textDelta;
        // Try to parse completed response objects from accumulated JSON
        // Send parsed responses as SSE events
        const parsed = tryParseCompletedResponses(fullJson);
        for (const response of parsed.newlyCompleted) {
          // Persist to DB
          await saveResponse(response, documentId);
          // Send to client
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(response)}\n\n`)
          );
        }
      });

      stream.on("error", (error) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
        );
        controller.close();
      });

      stream.on("end", () => {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      });
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

**Why this works:** The Claude SDK's `messages.stream()` fires `text` events as JSON tokens arrive. We accumulate the JSON string and detect when individual response objects complete (by tracking array brackets and braces). Each completed response is both persisted to DB and sent to the client as an SSE event.

### Pattern 2: Incremental JSON Parsing Strategy

**What:** Since Claude returns one large JSON array (all responses), we need to detect when individual response objects within the array complete during streaming.

**Strategy:** Track JSON depth. When the accumulated string forms a complete object within the `responses` array (matched opening/closing braces at the right depth), parse and emit it.

**Simpler alternative:** Use the `finalMessage()` accumulator to get the complete response, but send progress updates (response count) during streaming via the `text` event character counting. This is more reliable than incremental JSON parsing.

**Recommended approach:** Hybrid. Stream progress indicators ("Generating response 5/33...") to the client during streaming, then bulk-persist all responses after `finalMessage()` completes. This avoids the complexity of incremental JSON parsing while still providing real-time feedback.

```typescript
// Hybrid approach: stream progress, bulk persist at end
stream.on("text", (textDelta, textSnapshot) => {
  // Count completed response objects in snapshot for progress
  const completedCount = (textSnapshot.match(/"request_number"/g) || []).length;
  controller.enqueue(
    encoder.encode(`data: ${JSON.stringify({ type: "progress", count: completedCount, total: totalRequests })}\n\n`)
  );
});

const message = await stream.finalMessage();
const fullText = message.content[0].type === "text" ? message.content[0].text : "";
const parsed = generationResponseSchema.parse(JSON.parse(fullText));
// Bulk persist all responses
await saveAllResponses(parsed.responses, documentId);
// Send final event with all responses
controller.enqueue(
  encoder.encode(`data: ${JSON.stringify({ type: "complete", responses: parsed.responses })}\n\n`)
);
```

### Pattern 3: Client-Side SSE Consumption

**What:** The client component uses `fetch` with `ReadableStream` reader to consume SSE events from the Route Handler.

```typescript
// Client-side consumption pattern
async function generateResponses(caseId: string, documentId: string) {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ caseId, documentId }),
  });

  const reader = response.body!
    .pipeThrough(new TextDecoderStream())
    .getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    // Parse SSE events from chunk
    const lines = value.split("\n");
    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data === "[DONE]") return;
        const event = JSON.parse(data);
        if (event.type === "progress") {
          setProgress({ count: event.count, total: event.total });
        } else if (event.type === "complete") {
          setResponses(event.responses);
          router.refresh(); // Sync with server state
        } else if (event.error) {
          setError(event.error);
        }
      }
    }
  }
}
```

### Pattern 4: Database Schema for Generated Responses

**What:** New `generatedResponses` table linked to `extractedRequests`.

```typescript
// Addition to src/lib/db/schema.ts
export const generatedResponses = sqliteTable("generated_responses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  requestId: text("request_id")
    .notNull()
    .references(() => extractedRequests.id, { onDelete: "cascade" }),
  pattern: text("pattern").notNull(), // "produced_all" | "no_such_documents" | "objection" | "cross_reference"
  objectionTypes: text("objection_types"), // JSON array: ["privilege", "overbroad"] or null
  responseText: text("response_text").notNull(), // Full formatted response text
  crossReferenceNumber: integer("cross_reference_number"), // For Pattern D
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date()
  ),
});
```

**Key design decisions:**
- Link to `extractedRequests` (not `documents`) -- enables 1:1 mapping between request and response
- `pattern` column enables UI display logic (color-coding, icons per pattern)
- `objectionTypes` as JSON text string -- SQLite doesn't have array type, Drizzle handles JSON serialization
- `responseText` stores the complete formatted text ready for display
- `crossReferenceNumber` stores which request is referenced for Pattern D
- Cascade delete from `extractedRequests` -- re-extraction deletes responses automatically

### Pattern 5: Re-generate Safety (Following Phase 3 Pattern)

**What:** Delete all existing `generatedResponses` for a document's requests before starting new generation. Same pattern as re-extract in Phase 3.

```typescript
// Delete old responses before generating new ones
const requestIds = existingRequests.map(r => r.id);
if (requestIds.length > 0) {
  await db
    .delete(generatedResponses)
    .where(inArray(generatedResponses.requestId, requestIds));
}
```

### Anti-Patterns to Avoid
- **Individual API calls per request:** Making 33 separate Claude calls instead of one. Violates D-06/RFP-05 and costs 33x more.
- **Polling instead of SSE:** Using `setInterval` to check generation status. Wastes resources and adds latency. SSE is push-based.
- **Storing responses as JSON blob:** Storing all responses in a single JSON column on the case/document. Makes individual response editing (Phase 6) much harder.
- **Server Action for streaming:** Server Actions return a single value. They cannot stream data to the client. Use a Route Handler instead.
- **EventSource API for POST:** The browser `EventSource` API only supports GET requests. Since we need to POST the caseId/documentId, use `fetch` with `ReadableStream` reader instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema from Zod | Manual dual-schema maintenance | `zodOutputFormat()` from `@anthropic-ai/sdk/helpers/zod` | SDK helper auto-converts Zod schema to JSON schema for `output_config`. Eliminates the manual dual-schema pattern from Phase 3. |
| Stream event parsing | Custom SSE parser | `TextDecoderStream` + line splitting | Standard approach, well-tested |
| Claude streaming management | Manual HTTP chunking | `client.messages.stream()` | SDK handles SSE parsing, reconnection, event typing |
| Progress tracking | Custom token counter | Count `"request_number"` occurrences in accumulated text | Lightweight regex approach, no JSON parsing needed |

**Key insight:** The `zodOutputFormat()` helper available in the installed SDK (v0.82.0) eliminates the need for maintaining parallel Zod and JSON schemas. Phase 3 manually wrote both; Phase 4 can use one Zod schema that auto-converts. However, for consistency with the existing codebase, the planner may choose to maintain the dual-schema pattern -- both approaches work.

## Common Pitfalls

### Pitfall 1: max_tokens Too Low for Large RFP Sets
**What goes wrong:** A 33-request RFP set with complex objection responses can easily exceed 8192 tokens. Claude returns `stop_reason: "max_tokens"` and the JSON is truncated/invalid.
**Why it happens:** Phase 3 used `max_tokens: 8192` for extraction. Generation produces much more text.
**How to avoid:** Set `max_tokens: 16384` (or higher). A 33-request set with full objection responses averages ~8000-12000 tokens. Use 16384 for safety margin. Monitor `stop_reason` and retry with higher limit if needed.
**Warning signs:** `stop_reason: "max_tokens"` in the response, JSON parse errors after streaming completes.

### Pitfall 2: Vercel Function Timeout
**What goes wrong:** The 60-second Vercel Pro timeout is reached before Claude finishes generating all responses, killing the connection mid-stream.
**Why it happens:** Claude Sonnet generating 33 structured responses with complaint analysis can take 30-50 seconds. Network latency adds more.
**How to avoid:** Set `export const maxDuration = 60` on the Route Handler. Use streaming (which keeps the connection alive with data). If 60s is still not enough for very large sets, implement D-13 (partial save + continue).
**Warning signs:** 504 Gateway Timeout errors. Responses cut off partway through.

### Pitfall 3: SSE Buffering in Next.js
**What goes wrong:** Next.js buffers the entire Route Handler response before sending it, defeating the purpose of streaming.
**Why it happens:** Missing `export const dynamic = "force-dynamic"` or `export const runtime = "nodejs"` on the Route Handler.
**How to avoid:** Always include these exports at the top of the Route Handler file:
```typescript
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
```
**Warning signs:** Client receives all data at once instead of incrementally. No progress updates visible.

### Pitfall 4: Structured Output Schema Compilation Latency
**What goes wrong:** The first generation request takes noticeably longer than subsequent ones.
**Why it happens:** Claude compiles the JSON schema into a grammar on first use. Compiled grammars are cached for 24 hours.
**How to avoid:** Accept the one-time latency. It's typically 1-3 seconds extra. The cache persists across requests. Do not change the schema structure between requests unless necessary -- schema changes invalidate the cache.
**Warning signs:** First generation takes 5-10 seconds longer than subsequent ones.

### Pitfall 5: Re-generate Deletes Responses Before New Ones Exist
**What goes wrong:** User clicks Re-generate, old responses are deleted, but the new generation fails. Now the user has zero responses.
**Why it happens:** Eager deletion before confirming new generation succeeds.
**How to avoid:** Two strategies: (a) Delete old responses only after new generation completes successfully (optimistic), or (b) Delete first but implement D-13 partial save so partial results are always kept. Strategy (b) aligns with CONTEXT.md D-09 ("Old responses deleted before new ones inserted") and is simpler.
**Warning signs:** User reports losing responses after failed re-generation.

### Pitfall 6: Complaint PDF Not Found
**What goes wrong:** Generation fails because no complaint document is uploaded for the case, or the complaint blob URL returns 404.
**Why it happens:** Complaint is optional per D-11.
**How to avoid:** Check for complaint document before building the Claude message. If missing, proceed without complaint context and show the limitation banner. If blob fetch fails (404), treat as missing complaint with appropriate error message.
**Warning signs:** Generation crashes instead of degrading gracefully.

### Pitfall 7: Prompt Drift from Jessica's Voice
**What goes wrong:** AI generates responses that sound generic or use different phrasing than Jessica's actual patterns.
**Why it happens:** Prompt doesn't include Jessica's exact verbatim formulas.
**How to avoid:** The system prompt MUST include Jessica's exact phrases from the Swan case responses, not paraphrased versions. Embed the literal text of each objection formula. Use few-shot examples from the Swan case.
**Warning signs:** Generated responses use "objects" instead of "documents", or different objection phrasing.

## Code Examples

### Generation Response Schema (Zod)

```typescript
// src/lib/generation/schema.ts
import { z } from "zod";

const objectionTypeEnum = z.enum([
  "privilege",
  "overbroad_irrelevant",
  "premature",
  "compound",
]);

const responsePatternEnum = z.enum([
  "produced_all",
  "no_such_documents",
  "objection",
  "cross_reference",
]);

const generatedResponseSchema = z.object({
  request_number: z.number().int().positive(),
  pattern: responsePatternEnum,
  objection_types: z.array(objectionTypeEnum).nullable(),
  response_text: z.string(),
  cross_reference_number: z.number().int().positive().nullable(),
});

export const generationResponseSchema = z.object({
  responses: z.array(generatedResponseSchema),
});

export type GenerationResponse = z.infer<typeof generationResponseSchema>;
export type GeneratedResponse = z.infer<typeof generatedResponseSchema>;
```

### Using zodOutputFormat (Simplifies Dual Schema)

```typescript
// Source: @anthropic-ai/sdk/helpers/zod (verified in installed v0.82.0)
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const stream = anthropic.messages.stream({
  model: "claude-sonnet-4-5",
  max_tokens: 16384,
  messages: [/* ... */],
  output_config: {
    format: zodOutputFormat(generationResponseSchema),
  },
});
```

### System Prompt Structure

```typescript
// src/lib/generation/prompt.ts
export function buildGenerationPrompt(
  requests: { number: number; text: string }[],
  hasComplaint: boolean
): string {
  const requestList = requests
    .map((r) => `REQUEST NO. ${r.number}: ${r.text}`)
    .join("\n\n");

  return `You are a legal response drafter for a plaintiff's civil rights attorney. Generate a response to each Request for Production of Documents (RFP) below.

## Response Patterns

Classify each request into exactly ONE of these four patterns:

### Pattern A: "produced_all" (DEFAULT when uncertain)
Use when the request asks for documents the plaintiff likely has.
Response: "Plaintiff has produced all such documents in his possession."

### Pattern B: "no_such_documents"
Use ONLY when the request asks for something the plaintiff clearly would not possess.
Response: "No such documents exist." OR "Plaintiff is not in possession of any such documents."

### Pattern C: "objection"
Use when the request is objectionable. Objection types:
- privilege: "Plaintiff objects to this request on the grounds that it seeks documents and information protected by the attorney-client privilege and/or work product doctrine."
- overbroad_irrelevant: "Plaintiff objects to this request as overly broad, unduly burdensome, and not reasonably calculated to lead to the discovery of admissible evidence."
- premature: "Plaintiff objects to this request as premature."
- compound: "Plaintiff objects to this request as compound."

After objection(s), ALWAYS include: "Without waiving any objection, [substantive response]."
The substantive response should be a complete, multi-paragraph answer where appropriate.

### Pattern D: "cross_reference"
Use when a later request substantially overlaps with an earlier one.
Response: "Defendant is referred to Plaintiff's response to request no. [X] herein."

## Critical Rules
1. When uncertain whether documents exist, ALWAYS use Pattern A ("produced_all"). Never fabricate claims about document non-existence.
2. Objection language must use the EXACT phrases above. Do not invent new objection formulas.
3. Process ALL requests. Do not skip any.
4. Cross-references should detect semantic overlap, not just keyword matching.
${hasComplaint ? "5. Use the complaint to inform your classification. Allegations in the complaint suggest documents that exist (Pattern A). Requests for things beyond the complaint's scope may warrant objection." : "5. No complaint was provided. Default more heavily toward Pattern A when uncertain."}

## Requests to Respond To

${requestList}

Return your response as structured JSON with a "responses" array.`;
}
```

### Route Handler SSE Endpoint

```typescript
// src/app/api/generate/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents, extractedRequests, generatedResponses } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { generationResponseSchema } from "@/lib/generation/schema";
import { buildGenerationPrompt } from "@/lib/generation/prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { caseId, documentId, startFrom } = await request.json();

  // Fetch requests and documents
  // ... build prompt ...
  // ... create streaming response ...
}
```

### Drizzle Migration Pattern

```sql
-- drizzle/0002_[name].sql
CREATE TABLE `generated_responses` (
  `id` text PRIMARY KEY NOT NULL,
  `request_id` text NOT NULL,
  `pattern` text NOT NULL,
  `objection_types` text,
  `response_text` text NOT NULL,
  `cross_reference_number` integer,
  `created_at` integer,
  FOREIGN KEY (`request_id`) REFERENCES `extracted_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `output_format` parameter | `output_config.format` parameter | 2025 GA release | No beta headers needed. Both work during transition. |
| Manual Zod + JSON schema | `zodOutputFormat()` helper | SDK 0.39.x+ | Single Zod schema auto-converts. Reduces maintenance. |
| `client.messages.create({ stream: true })` | `client.messages.stream()` | SDK stable | Higher-level API with event helpers, `.finalMessage()`, `.toReadableStream()` |

**Deprecated/outdated:**
- `output_format` parameter: Still works but migrating to `output_config.format`. The existing extraction code uses `output_config` already, so this is consistent.
- Beta header `structured-outputs-2025-11-13`: No longer needed. The project never used it.

## Open Questions

1. **Incremental vs. Bulk Persistence**
   - What we know: The hybrid approach (stream progress, bulk persist at end) is simpler and more reliable than incremental JSON parsing.
   - What's unclear: Whether D-13 (partial save on failure) requires incremental persistence or if catching the error and parsing whatever JSON was accumulated is sufficient.
   - Recommendation: Start with hybrid approach. For D-13, wrap the `finalMessage()` call in try-catch. On error, attempt to parse the accumulated text snapshot for any complete response objects and save those. This gives partial save without the complexity of incremental persistence during normal operation.

2. **"Continue Generation" Implementation**
   - What we know: D-13 requires a button that picks up generation from where it left off.
   - What's unclear: Whether this means re-sending ALL requests but asking Claude to skip already-generated ones, or only sending the remaining requests.
   - Recommendation: Send only the un-generated requests. Pass `startFrom` parameter to the Route Handler. Query the database for which request numbers already have responses, and build the prompt with only the remaining requests.

3. **max_tokens Sizing**
   - What we know: 33-request Swan RFP set produces ~8000-12000 response tokens. Complex objections (like Request 28 damages) can be 500+ tokens each.
   - What's unclear: Whether 16384 tokens is always sufficient, or if some edge cases need more.
   - Recommendation: Start with 16384. Monitor `stop_reason` in responses. If `max_tokens` is hit, log a warning and treat as partial failure (D-13 path).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RFP-01 | AI generates response for each RFP request with correct pattern | unit | `npx vitest run src/__tests__/generation-schema.test.ts -t "validates" -x` | No -- Wave 0 |
| RFP-02 | Correct pattern classification based on complaint + request | unit | `npx vitest run src/__tests__/generate.test.ts -t "classif" -x` | No -- Wave 0 |
| RFP-03 | Objection language matches exact formulas | unit | `npx vitest run src/__tests__/generation-schema.test.ts -t "objection" -x` | No -- Wave 0 |
| RFP-04 | "without waiving" bridge in objection responses | unit | `npx vitest run src/__tests__/generate.test.ts -t "without waiving" -x` | No -- Wave 0 |
| RFP-05 | All responses generated in single pass | unit | `npx vitest run src/__tests__/generate.test.ts -t "single" -x` | No -- Wave 0 |
| RFP-06 | No fabrication, defaults to "produced all" | unit | `npx vitest run src/__tests__/generate.test.ts -t "default" -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/generation-schema.test.ts` -- Zod schema validation for all four response patterns, objection type enum, nullable fields
- [ ] `src/__tests__/generate.test.ts` -- Generation action/route handler tests with mocked Claude API, auth, DB (follows Phase 3 `extract.test.ts` pattern)
- [ ] `src/__tests__/generate-route.test.ts` -- Route Handler SSE streaming tests (optional if covered in generate.test.ts)

(No framework install needed -- vitest 4.1.2 already configured and working with 38 tests passing)

## Sources

### Primary (HIGH confidence)
- [Anthropic Streaming Messages docs](https://platform.claude.com/docs/en/build-with-claude/streaming) -- Streaming API reference, `.stream()` method, event types, `toReadableStream()`
- [Anthropic Structured Outputs docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) -- `output_config.format`, JSON schema support, streaming compatibility, schema limitations, performance
- [@anthropic-ai/sdk v0.82.0](https://www.npmjs.com/package/@anthropic-ai/sdk) -- Installed SDK, verified `MessageStream` types in `node_modules` type definitions
- [SDK helpers/zod.d.ts](file:node_modules/@anthropic-ai/sdk/helpers/zod.d.ts) -- Verified `zodOutputFormat()` function signature in installed package
- [SDK lib/MessageStream.d.ts](file:node_modules/@anthropic-ai/sdk/lib/MessageStream.d.ts) -- Verified event types: `text`, `message`, `contentBlock`, `finalMessage`, `error`, `end`, `toReadableStream()`

### Secondary (MEDIUM confidence)
- [Upstash SSE Streaming LLM Guide](https://upstash.com/blog/sse-streaming-llm-responses) -- Next.js Route Handler SSE pattern with `ReadableStream`, `force-dynamic`, `TextDecoderStream`
- [Anthropic SDK GitHub streaming example](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/examples/streaming.ts) -- Official example code for `.stream()` with `.on()` events

### Project Source (HIGH confidence)
- `src/actions/extract.ts` -- Existing Claude API call pattern with base64 PDF, `output_config`, structured output
- `src/lib/extraction/schema.ts` -- Existing dual Zod + JSON schema pattern
- `src/lib/db/schema.ts` -- Existing database schema, relations pattern
- `src/components/extracted-requests.tsx` -- Existing "Generate Responses" button (disabled), UI integration point

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and verified in `package.json` and `node_modules`
- Architecture: HIGH -- SSE Route Handler is the standard Next.js streaming pattern, Claude SDK streaming API verified in installed types
- Pitfalls: HIGH -- drawn from official docs (max_tokens, SSE buffering, schema compilation) and project-specific context (Vercel timeout, complaint optional)
- Prompt engineering: MEDIUM -- voice matching quality depends on runtime testing with Jessica's actual documents; pattern structure is sound but exact wording needs iteration

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (30 days -- stable stack, no fast-moving components)
