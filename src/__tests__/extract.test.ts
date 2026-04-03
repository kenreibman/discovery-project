import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const mockFindFirst = vi.fn();
const mockFindMany = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    query: {
      documents: { findFirst: (...args: unknown[]) => mockFindFirst(...args) },
      cases: { findFirst: (...args: unknown[]) => mockFindMany(...args) },
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "test-user-id" } }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// --- Helpers ---

const MOCK_CLAUDE_RESPONSE = {
  content: [
    {
      type: "text",
      text: JSON.stringify({
        discovery_type: "rfp",
        case_name: "Swan v. Dollar Tree",
        requests: [
          { number: 1, text: "All documents relating to the incident" },
          { number: 2, text: "Employment records for plaintiff" },
        ],
      }),
    },
  ],
};

function setupMocks() {
  // Mock document lookup
  mockFindFirst.mockResolvedValue({
    id: "doc-1",
    blobUrl: "https://blob.vercel.com/test.pdf",
    caseId: "case-1",
  });

  // Mock fetch for PDF retrieval
  mockFetch.mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)),
  });

  // Mock Claude API
  mockCreate.mockResolvedValue(MOCK_CLAUDE_RESPONSE);

  // Mock DB operations with chainable returns
  mockDelete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  mockInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "req-1" }]),
    }),
  });
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });

  // Mock case lookup (name is null -- should auto-name)
  mockFindMany.mockResolvedValue({
    id: "case-1",
    name: null,
    userId: "test-user-id",
  });
}

// --- Tests ---

describe("extractRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("fetches PDF from blobUrl and calls Claude with base64 document block", async () => {
    const { extractRequests } = await import("@/actions/extract");
    await extractRequests("doc-1", "case-1");

    // Verify fetch was called with the blob URL
    expect(mockFetch).toHaveBeenCalledWith("https://blob.vercel.com/test.pdf");

    // Verify Claude was called with document content block
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content[0].type).toBe("document");
    expect(callArgs.messages[0].content[0].source.type).toBe("base64");
    expect(callArgs.messages[0].content[0].source.media_type).toBe("application/pdf");

    // Verify output_config with json_schema
    expect(callArgs.output_config).toBeDefined();
    expect(callArgs.output_config.format.type).toBe("json_schema");
  });

  it("stores parsed requests in extracted_requests table", async () => {
    const { extractRequests } = await import("@/actions/extract");
    await extractRequests("doc-1", "case-1");

    // Verify insert was called (for extractedRequests table)
    expect(mockInsert).toHaveBeenCalled();
  });

  it("updates document subType to the returned discovery_type", async () => {
    const { extractRequests } = await import("@/actions/extract");
    await extractRequests("doc-1", "case-1");

    // Verify update was called (for documents.subType)
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("sets case name when case.name is null (D-09)", async () => {
    mockFindMany.mockResolvedValue({
      id: "case-1",
      name: null,
      userId: "test-user-id",
    });

    const { extractRequests } = await import("@/actions/extract");
    await extractRequests("doc-1", "case-1");

    // Update should be called at least twice: once for subType, once for case name
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it("does NOT overwrite case name when already set (D-10)", async () => {
    mockFindMany.mockResolvedValue({
      id: "case-1",
      name: "Existing Name",
      userId: "test-user-id",
    });

    const { extractRequests } = await import("@/actions/extract");
    await extractRequests("doc-1", "case-1");

    // Update should be called only once (for subType, not case name)
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("deletes old extracted_requests before inserting new ones (re-extract)", async () => {
    const { extractRequests } = await import("@/actions/extract");
    await extractRequests("doc-1", "case-1");

    // Delete should be called before insert
    expect(mockDelete).toHaveBeenCalled();
    const deleteCallOrder = mockDelete.mock.invocationCallOrder[0];
    const insertCallOrder = mockInsert.mock.invocationCallOrder[0];
    expect(deleteCallOrder).toBeLessThan(insertCallOrder);
  });

  it("returns { success: true, requestCount: N } on success", async () => {
    const { extractRequests } = await import("@/actions/extract");
    const result = await extractRequests("doc-1", "case-1");

    expect(result).toEqual({ success: true, requestCount: 2 });
  });

  it("returns { success: false, error: string } on Claude API failure", async () => {
    mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

    const { extractRequests } = await import("@/actions/extract");
    const result = await extractRequests("doc-1", "case-1");

    expect(result.success).toBe(false);
    expect("error" in result && result.error).toBeTruthy();
  });
});

describe("updateDocumentSubType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  it("updates subType column and revalidates path", async () => {
    const { updateDocumentSubType } = await import("@/actions/documents");
    const { revalidatePath } = await import("next/cache");
    await updateDocumentSubType("doc-1", "rfp", "case-1");

    expect(mockUpdate).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/case/case-1");
  });
});
