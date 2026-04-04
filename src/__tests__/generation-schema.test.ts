import { describe, it, expect } from "vitest";
import {
  generationResponseSchema,
  type GeneratedResponse,
  type GenerationResponse,
  type ObjectionType,
  type ResponsePattern,
} from "@/lib/generation/schema";

describe("generationResponseSchema", () => {
  it("parses valid produced_all pattern", () => {
    const valid = {
      responses: [
        {
          request_number: 1,
          pattern: "produced_all",
          objection_types: null,
          response_text:
            "Plaintiff has produced all such documents in his possession.",
          cross_reference_number: null,
        },
      ],
    };
    const result = generationResponseSchema.parse(valid);
    expect(result.responses).toHaveLength(1);
    expect(result.responses[0].pattern).toBe("produced_all");
    expect(result.responses[0].objection_types).toBeNull();
    expect(result.responses[0].cross_reference_number).toBeNull();
  });

  it("parses valid no_such_documents pattern", () => {
    const valid = {
      responses: [
        {
          request_number: 2,
          pattern: "no_such_documents",
          objection_types: null,
          response_text: "No such documents exist.",
          cross_reference_number: null,
        },
      ],
    };
    const result = generationResponseSchema.parse(valid);
    expect(result.responses[0].pattern).toBe("no_such_documents");
    expect(result.responses[0].response_text).toBe("No such documents exist.");
  });

  it("parses valid objection pattern with objection_types array", () => {
    const valid = {
      responses: [
        {
          request_number: 3,
          pattern: "objection",
          objection_types: ["privilege", "overbroad_irrelevant"],
          response_text:
            "Plaintiff objects to this request on the grounds that it seeks documents and information protected by the attorney-client privilege and/or work product doctrine. Plaintiff further objects to this request as overly broad, unduly burdensome, and not reasonably calculated to lead to the discovery of admissible evidence. Without waiving any objection, Plaintiff states that no responsive documents exist.",
          cross_reference_number: null,
        },
      ],
    };
    const result = generationResponseSchema.parse(valid);
    expect(result.responses[0].pattern).toBe("objection");
    expect(result.responses[0].objection_types).toEqual([
      "privilege",
      "overbroad_irrelevant",
    ]);
  });

  it("parses valid cross_reference pattern with cross_reference_number", () => {
    const valid = {
      responses: [
        {
          request_number: 29,
          pattern: "cross_reference",
          objection_types: null,
          response_text:
            "Defendant is referred to Plaintiff's response to request no. 28 herein.",
          cross_reference_number: 28,
        },
      ],
    };
    const result = generationResponseSchema.parse(valid);
    expect(result.responses[0].pattern).toBe("cross_reference");
    expect(result.responses[0].cross_reference_number).toBe(28);
  });

  it("rejects invalid pattern value", () => {
    const invalid = {
      responses: [
        {
          request_number: 1,
          pattern: "unknown_pattern",
          objection_types: null,
          response_text: "Some text",
          cross_reference_number: null,
        },
      ],
    };
    expect(() => generationResponseSchema.parse(invalid)).toThrow();
  });

  it("rejects invalid objection_type value", () => {
    const invalid = {
      responses: [
        {
          request_number: 1,
          pattern: "objection",
          objection_types: ["invalid_type"],
          response_text: "Some text",
          cross_reference_number: null,
        },
      ],
    };
    expect(() => generationResponseSchema.parse(invalid)).toThrow();
  });

  it("rejects missing required field (response_text)", () => {
    const invalid = {
      responses: [
        {
          request_number: 1,
          pattern: "produced_all",
          objection_types: null,
          cross_reference_number: null,
        },
      ],
    };
    expect(() => generationResponseSchema.parse(invalid)).toThrow();
  });

  it("parses a full Swan-like response set with 33 responses of mixed patterns", () => {
    const responses = [];
    // Mix of all four patterns, simulating a real 33-request RFP set
    for (let i = 1; i <= 33; i++) {
      if (i <= 10) {
        responses.push({
          request_number: i,
          pattern: "produced_all",
          objection_types: null,
          response_text:
            "Plaintiff has produced all such documents in his possession.",
          cross_reference_number: null,
        });
      } else if (i <= 15) {
        responses.push({
          request_number: i,
          pattern: "no_such_documents",
          objection_types: null,
          response_text: "No such documents exist.",
          cross_reference_number: null,
        });
      } else if (i <= 28) {
        responses.push({
          request_number: i,
          pattern: "objection",
          objection_types: ["privilege"],
          response_text:
            "Plaintiff objects to this request on the grounds that it seeks documents and information protected by the attorney-client privilege and/or work product doctrine. Without waiving any objection, Plaintiff has produced all responsive non-privileged documents.",
          cross_reference_number: null,
        });
      } else {
        responses.push({
          request_number: i,
          pattern: "cross_reference",
          objection_types: null,
          response_text: `Defendant is referred to Plaintiff's response to request no. ${i - 1} herein.`,
          cross_reference_number: i - 1,
        });
      }
    }

    const valid = { responses };
    const result = generationResponseSchema.parse(valid);
    expect(result.responses).toHaveLength(33);

    // Verify pattern distribution
    const patterns = result.responses.map((r) => r.pattern);
    expect(patterns.filter((p) => p === "produced_all")).toHaveLength(10);
    expect(patterns.filter((p) => p === "no_such_documents")).toHaveLength(5);
    expect(patterns.filter((p) => p === "objection")).toHaveLength(13);
    expect(patterns.filter((p) => p === "cross_reference")).toHaveLength(5);
  });
});
