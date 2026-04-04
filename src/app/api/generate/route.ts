import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  documents,
  extractedRequests,
  generatedResponses,
} from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
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

  // 1. Fetch all documents for this case (to find complaint + RFP)
  const caseDocuments = await db.query.documents.findMany({
    where: eq(documents.caseId, caseId),
  });

  const rfpDoc = caseDocuments.find((d) => d.id === documentId);
  const complaintDoc = caseDocuments.find((d) => d.type === "complaint");

  if (!rfpDoc) {
    return new Response("Document not found", { status: 404 });
  }

  // 2. Fetch extracted requests for this document
  let requests = await db.query.extractedRequests.findMany({
    where: eq(extractedRequests.documentId, documentId),
  });

  // Sort by request number ascending
  requests = requests.sort((a, b) => a.requestNumber - b.requestNumber);

  // Filter by startFrom for continue generation (D-13)
  if (startFrom) {
    requests = requests.filter((r) => r.requestNumber >= startFrom);
  }

  if (requests.length === 0) {
    return new Response("No extracted requests found", { status: 400 });
  }

  const totalRequests = requests.length;

  // 3. Fetch PDFs from Vercel Blob and base64-encode them
  const contentBlocks: Anthropic.Messages.ContentBlockParam[] = [];

  // Complaint PDF first (if available, per D-10)
  if (complaintDoc) {
    try {
      const complaintResponse = await fetch(complaintDoc.blobUrl, {
        headers: {
          Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        },
      });
      if (complaintResponse.ok) {
        const complaintBuffer = await complaintResponse.arrayBuffer();
        const complaintBase64 = Buffer.from(complaintBuffer).toString("base64");
        contentBlocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: complaintBase64,
          },
        } as Anthropic.Messages.ContentBlockParam);
      }
    } catch {
      // Complaint fetch failed -- proceed without (D-11 fallback)
    }
  }

  // RFP PDF
  const rfpResponse = await fetch(rfpDoc.blobUrl, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });
  if (!rfpResponse.ok) {
    return new Response("Could not retrieve the RFP document", {
      status: 500,
    });
  }
  const rfpBuffer = await rfpResponse.arrayBuffer();
  const rfpBase64 = Buffer.from(rfpBuffer).toString("base64");
  contentBlocks.push({
    type: "document",
    source: {
      type: "base64",
      media_type: "application/pdf",
      data: rfpBase64,
    },
  } as Anthropic.Messages.ContentBlockParam);

  // Text block with generation prompt
  const hasComplaint = !!complaintDoc && contentBlocks.length > 1;
  const promptText = buildGenerationPrompt(
    requests.map((r) => ({ number: r.requestNumber, text: r.text })),
    hasComplaint
  );
  contentBlocks.push({ type: "text", text: promptText });

  // 4. Create Claude streaming call
  const anthropic = new Anthropic();
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 16384,
    messages: [
      {
        role: "user",
        content: contentBlocks,
      },
    ],
    output_config: {
      format: zodOutputFormat(generationResponseSchema),
    },
  });

  // 5. Stream SSE to client (hybrid approach per RESEARCH Pattern 2)
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Track progress via text events
        stream.on("text", (_textDelta: string, textSnapshot: string) => {
          // Count "request_number" occurrences in snapshot for progress
          const completedCount = (
            textSnapshot.match(/"request_number"/g) || []
          ).length;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "progress",
                count: completedCount,
                total: totalRequests,
              })}\n\n`
            )
          );
        });

        // Wait for complete message
        const message = await stream.finalMessage();
        const fullText =
          message.content[0].type === "text" ? message.content[0].text : "";

        // Parse and validate response
        const parsed = generationResponseSchema.parse(JSON.parse(fullText));

        // Bulk-persist all responses to database
        if (parsed.responses.length > 0) {
          const insertValues = parsed.responses
            .map((resp) => {
              const matchingRequest = requests.find(
                (r) => r.requestNumber === resp.request_number
              );
              if (!matchingRequest) return null;
              return {
                requestId: matchingRequest.id,
                pattern: resp.pattern,
                objectionTypes: resp.objection_types
                  ? JSON.stringify(resp.objection_types)
                  : null,
                responseText: resp.response_text,
                crossReferenceNumber: resp.cross_reference_number,
              };
            })
            .filter(
              (v): v is NonNullable<typeof v> => v !== null
            );

          if (insertValues.length > 0) {
            await db.insert(generatedResponses).values(insertValues);
          }
        }

        // Send complete event with all responses
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              responses: parsed.responses,
            })}\n\n`
          )
        );
      } catch (error) {
        // D-13: Attempt partial save on failure
        let savedCount = 0;
        try {
          // Try to get whatever text was accumulated
          const partialMessage = await stream.finalMessage().catch(() => null);
          if (partialMessage) {
            const partialText =
              partialMessage.content[0].type === "text"
                ? partialMessage.content[0].text
                : "";
            // Try to extract any valid responses from partial JSON
            const partialMatch = partialText.match(
              /\{"responses"\s*:\s*\[([\s\S]*)\]/
            );
            if (partialMatch) {
              try {
                const parsed = generationResponseSchema.parse(
                  JSON.parse(partialText)
                );
                const insertValues = parsed.responses
                  .map((resp) => {
                    const matchingRequest = requests.find(
                      (r) => r.requestNumber === resp.request_number
                    );
                    if (!matchingRequest) return null;
                    return {
                      requestId: matchingRequest.id,
                      pattern: resp.pattern,
                      objectionTypes: resp.objection_types
                        ? JSON.stringify(resp.objection_types)
                        : null,
                      responseText: resp.response_text,
                      crossReferenceNumber: resp.cross_reference_number,
                    };
                  })
                  .filter(
                    (v): v is NonNullable<typeof v> => v !== null
                  );

                if (insertValues.length > 0) {
                  await db.insert(generatedResponses).values(insertValues);
                  savedCount = insertValues.length;
                }
              } catch {
                // Partial JSON wasn't parseable -- no partial save
              }
            }
          }
        } catch {
          // Could not retrieve partial content
        }

        const errMessage =
          error instanceof Error ? error.message : "Generation failed";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: errMessage,
              savedCount,
            })}\n\n`
          )
        );
      } finally {
        // Signal stream end
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
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
