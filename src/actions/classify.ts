"use server";

import Anthropic from "@anthropic-ai/sdk";
import { extractText } from "unpdf";

const anthropic = new Anthropic();

export async function classifyDocument(blobUrl: string): Promise<{
  type: "complaint" | "discovery_request";
  confidence: number;
}> {
  // Fetch PDF from Vercel Blob and extract first page text
  const response = await fetch(blobUrl);
  const buffer = await response.arrayBuffer();
  const { text } = await extractText(new Uint8Array(buffer), { mergePages: false });
  const firstPageText = text[0] || "";

  if (!firstPageText.trim()) {
    // If no text extracted (scanned PDF), default to discovery_request
    return { type: "discovery_request", confidence: 0.5 };
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Classify this legal document as either "complaint" or "discovery_request" (which includes requests for production, interrogatories, requests for admission, etc.).

Return ONLY a JSON object with no other text: {"type": "complaint" | "discovery_request", "confidence": 0.0-1.0}

Document text (first page):
${firstPageText.slice(0, 3000)}`,
        },
      ],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(responseText);
    return {
      type: parsed.type === "complaint" ? "complaint" : "discovery_request",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
    };
  } catch {
    // Classification failed -- return default, user can override per D-06
    return { type: "discovery_request", confidence: 0.5 };
  }
}
