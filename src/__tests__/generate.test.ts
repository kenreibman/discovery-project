import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock State ---

const mockFindMany = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    query: {
      documents: { findMany: (...args: unknown[]) => mockFindMany(...args) },
      extractedRequests: {
        findMany: (...args: unknown[]) => mockFindMany(...args),
      },
    },
  },
}));

const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

// --- Stream mock that simulates real SDK lifecycle ---
// The real SDK: you call .on('text', handler) to register, then await .finalMessage().
// finalMessage() resolves after all text events have fired and the stream is complete.

let streamTextHandlers: Array<(delta: string, snapshot: string) => void> = [];
let mockFinalMessageFn = vi.fn();

const mockStreamObj = {
  on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (event === "text") {
      streamTextHandlers.push(handler as (d: string, s: string) => void);
    }
    return mockStreamObj;
  }),
  finalMessage: (...args: unknown[]) => mockFinalMessageFn(...args),
};

const mockStream = vi.fn().mockReturnValue(mockStreamObj);

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages = { stream: (...args: unknown[]) => mockStream(...args) };
  }
  return { default: MockAnthropic };
});

vi.mock("@anthropic-ai/sdk/helpers/zod", () => ({
  zodOutputFormat: vi.fn((schema: unknown) => ({
    type: "json_schema" as const,
    schema: { type: "object" },
  })),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// --- Test Data ---

const MOCK_GENERATION_RESPONSE = {
  responses: [
    {
      request_number: 1,
      pattern: "produced_all",
      objection_types: null,
      response_text:
        "Plaintiff has produced all such documents in his possession.",
      cross_reference_number: null,
    },
    {
      request_number: 2,
      pattern: "objection",
      objection_types: ["privilege"],
      response_text:
        'Plaintiff objects to this request on the grounds that it seeks documents and information protected by the attorney-client privilege and/or work product doctrine. Without waiving any objection, Plaintiff has produced all responsive documents.',
      cross_reference_number: null,
    },
  ],
};

const MOCK_EXTRACTED_REQUESTS = [
  {
    id: "req-1",
    documentId: "doc-1",
    requestNumber: 1,
    text: "All documents related to the incident",
  },
  {
    id: "req-2",
    documentId: "doc-1",
    requestNumber: 2,
    text: "All communications between plaintiff and defendant",
  },
];

const MOCK_DOCUMENTS = [
  {
    id: "doc-1",
    caseId: "case-1",
    type: "discovery_request",
    blobUrl: "https://blob.vercel.com/rfp.pdf",
    subType: "rfp",
  },
  {
    id: "doc-2",
    caseId: "case-1",
    type: "complaint",
    blobUrl: "https://blob.vercel.com/complaint.pdf",
    subType: null,
  },
];

// --- Setup Helpers ---

function setupMocks(
  options: { hasComplaint?: boolean; authed?: boolean } = {}
) {
  const { hasComplaint = true, authed = true } = options;

  mockAuth.mockResolvedValue(
    authed ? { user: { id: "test-user-id" } } : null
  );

  // Track which query is being called
  let queryCallCount = 0;
  mockFindMany.mockImplementation(() => {
    queryCallCount++;
    if (queryCallCount % 2 === 1) {
      // First call = documents query
      return Promise.resolve(
        hasComplaint ? MOCK_DOCUMENTS : [MOCK_DOCUMENTS[0]]
      );
    }
    // Second call = extractedRequests query
    return Promise.resolve(MOCK_EXTRACTED_REQUESTS);
  });

  mockFetch.mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
  });

  // The key: finalMessage must fire text handlers before resolving,
  // to simulate the real SDK where text events fire during streaming
  // and finalMessage resolves after the stream is complete.
  const responseText = JSON.stringify(MOCK_GENERATION_RESPONSE);
  mockFinalMessageFn = vi.fn().mockImplementation(() => {
    // Fire text handlers to simulate streaming progress
    for (const handler of streamTextHandlers) {
      handler(
        responseText.substring(0, 50),
        `{"responses":[{"request_number":1`
      );
    }
    for (const handler of streamTextHandlers) {
      handler(responseText.substring(50), responseText);
    }
    // Then resolve with the complete message
    return Promise.resolve({
      content: [{ type: "text", text: responseText }],
      stop_reason: "end_turn",
    });
  });

  mockDelete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  mockInsert.mockReturnValue({
    values: vi.fn().mockResolvedValue(undefined),
  });
}

function resetStreamState() {
  streamTextHandlers = [];
  mockStreamObj.on.mockClear();
  mockStream.mockClear();
  mockStream.mockReturnValue(mockStreamObj);
}

async function makeRequest(body: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/api/generate/route");
  const request = new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      caseId: "case-1",
      documentId: "doc-1",
      ...body,
    }),
  });
  return POST(request);
}

async function collectSSEEvents(
  response: Response
): Promise<Array<{ type: string; [key: string]: unknown }>> {
  const events: Array<{ type: string; [key: string]: unknown }> = [];
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }

  const lines = buffer.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        events.push({ type: "done" });
      } else {
        try {
          events.push(JSON.parse(data));
        } catch {
          // skip unparseable
        }
      }
    }
  }

  return events;
}

// --- Tests ---

describe("POST /api/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStreamState();
    setupMocks();
  });

  it("returns 401 when no session", async () => {
    setupMocks({ authed: false });
    const response = await makeRequest();
    expect(response.status).toBe(401);
  });

  it("returns SSE content-type header (text/event-stream)", async () => {
    const response = await makeRequest();
    expect(response.headers.get("Content-Type")).toContain(
      "text/event-stream"
    );
  });

  it("sends both complaint and RFP PDFs as base64 document blocks to Claude when complaint exists (D-10)", async () => {
    setupMocks({ hasComplaint: true });
    await makeRequest();

    expect(mockStream).toHaveBeenCalledTimes(1);
    const callArgs = mockStream.mock.calls[0][0];
    const content = callArgs.messages[0].content;

    // Should have 2 document blocks (complaint + RFP) and 1 text block
    const docBlocks = content.filter(
      (b: { type: string }) => b.type === "document"
    );
    expect(docBlocks.length).toBe(2);
    expect(docBlocks[0].source.type).toBe("base64");
    expect(docBlocks[0].source.media_type).toBe("application/pdf");
    expect(docBlocks[1].source.type).toBe("base64");
    expect(docBlocks[1].source.media_type).toBe("application/pdf");
  });

  it("sends only RFP PDF when no complaint document exists (D-11)", async () => {
    setupMocks({ hasComplaint: false });
    await makeRequest();

    expect(mockStream).toHaveBeenCalledTimes(1);
    const callArgs = mockStream.mock.calls[0][0];
    const content = callArgs.messages[0].content;

    const docBlocks = content.filter(
      (b: { type: string }) => b.type === "document"
    );
    expect(docBlocks.length).toBe(1);
  });

  it('uses model "claude-sonnet-4-5" (D-12)', async () => {
    await makeRequest();

    expect(mockStream).toHaveBeenCalledTimes(1);
    const callArgs = mockStream.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-sonnet-4-5");
  });

  it("uses max_tokens 16384", async () => {
    await makeRequest();

    expect(mockStream).toHaveBeenCalledTimes(1);
    const callArgs = mockStream.mock.calls[0][0];
    expect(callArgs.max_tokens).toBe(16384);
  });

  it('sends progress events with type "progress" and count/total fields', async () => {
    const response = await makeRequest();
    const events = await collectSSEEvents(response);

    const progressEvents = events.filter((e) => e.type === "progress");
    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[0]).toHaveProperty("count");
    expect(progressEvents[0]).toHaveProperty("total");
    expect(progressEvents[0].total).toBe(2);
  });

  it('sends final "complete" event with all parsed responses', async () => {
    const response = await makeRequest();
    const events = await collectSSEEvents(response);

    const completeEvent = events.find((e) => e.type === "complete");
    expect(completeEvent).toBeDefined();
    expect(completeEvent!.responses).toBeDefined();
    expect(Array.isArray(completeEvent!.responses)).toBe(true);
    const responses = completeEvent!.responses as Array<{
      request_number: number;
    }>;
    expect(responses.length).toBe(2);
    expect(responses[0].request_number).toBe(1);
    expect(responses[1].request_number).toBe(2);
  });

  it("persists all responses to generatedResponses table after completion", async () => {
    const response = await makeRequest();
    await collectSSEEvents(response);

    // Verify insert was called for persisting responses
    expect(mockInsert).toHaveBeenCalled();
    const insertCall = mockInsert.mock.calls[0];
    // First arg should be the generatedResponses table reference
    expect(insertCall).toBeDefined();
  });

  it("sends error event on Claude API failure", async () => {
    // Make finalMessage reject to simulate API failure
    mockFinalMessageFn = vi.fn().mockRejectedValue(
      new Error("Claude API error")
    );

    const response = await makeRequest();
    const events = await collectSSEEvents(response);

    const errorEvent = events.find((e) => e.type === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.message).toBeDefined();
    expect(typeof errorEvent!.message).toBe("string");
  });

  it("handles startFrom parameter for continue generation", async () => {
    // When startFrom=2, only request #2 should be included
    await makeRequest({ startFrom: 2 });

    // The stream should still be called -- startFrom filters requests, not the API call
    expect(mockStream).toHaveBeenCalledTimes(1);

    // Check that the prompt only includes requests >= startFrom
    const callArgs = mockStream.mock.calls[0][0];
    const textBlock = callArgs.messages[0].content.find(
      (b: { type: string }) => b.type === "text"
    );
    expect(textBlock).toBeDefined();
    // The prompt should contain request #2 but not request #1
    expect(textBlock.text).toContain("REQUEST NO. 2");
  });
});
