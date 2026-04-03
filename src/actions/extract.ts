"use server";

import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { extractedRequests, documents, cases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  extractionResponseSchema,
  EXTRACTION_JSON_SCHEMA,
} from "@/lib/extraction/schema";
import { EXTRACTION_PROMPT } from "@/lib/extraction/prompt";

const anthropic = new Anthropic();

type ExtractResult =
  | { success: true; requestCount: number }
  | { success: false; error: string };

export async function extractRequests(
  documentId: string,
  caseId: string
): Promise<ExtractResult> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");

  try {
    // 1. Get document record to find blob URL
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });
    if (!doc) return { success: false, error: "Document not found" };

    // 2. Fetch PDF from Vercel Blob and base64-encode
    const response = await fetch(doc.blobUrl);
    if (!response.ok) {
      return {
        success: false,
        error: "Could not retrieve the uploaded PDF.",
      };
    }
    const buffer = await response.arrayBuffer();
    const pdfBase64 = Buffer.from(buffer).toString("base64");

    // 3. Call Claude with base64 PDF document block + structured output (D-08, D-12)
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
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
      output_config: {
        format: {
          type: "json_schema",
          schema: EXTRACTION_JSON_SCHEMA,
        },
      },
    });

    // 4. Parse and validate response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = extractionResponseSchema.parse(JSON.parse(responseText));

    // 5. Delete old requests then insert new ones (re-extract safe per D-04)
    await db
      .delete(extractedRequests)
      .where(eq(extractedRequests.documentId, documentId));

    if (parsed.requests.length > 0) {
      await db.insert(extractedRequests).values(
        parsed.requests.map((req) => ({
          documentId,
          requestNumber: req.number,
          text: req.text,
        }))
      );
    }

    // 6. Update document sub-type (D-13)
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
    return { success: true, requestCount: parsed.requests.length };
  } catch (error) {
    // D-06: Transparent processing, D-07: clear error on failure
    console.error("Extraction failed:", error);
    revalidatePath(`/case/${caseId}`);
    return {
      success: false,
      error:
        "Could not extract requests from this PDF. The document may be a poor-quality scan.",
    };
  }
}
