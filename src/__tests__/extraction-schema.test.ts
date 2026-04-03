import { describe, it, expect } from "vitest";
import {
  extractionResponseSchema,
  EXTRACTION_JSON_SCHEMA,
  type ExtractionResponse,
} from "@/lib/extraction/schema";

describe("extractionResponseSchema", () => {
  it("parses valid RFP response with discovery_type, case_name, and requests", () => {
    const valid = {
      discovery_type: "rfp",
      case_name: "Swan v. Dollar Tree",
      requests: [
        { number: 1, text: "All documents relating to the incident" },
        { number: 2, text: "All communications between plaintiff and defendant" },
        { number: 3, text: "Any photographs of the premises" },
      ],
    };
    const result = extractionResponseSchema.parse(valid);
    expect(result.discovery_type).toBe("rfp");
    expect(result.case_name).toBe("Swan v. Dollar Tree");
    expect(result.requests).toHaveLength(3);
    expect(result.requests[0].number).toBe(1);
    expect(result.requests[0].text).toBe("All documents relating to the incident");
  });

  it("parses valid interrogatory response", () => {
    const valid = {
      discovery_type: "interrogatory",
      case_name: "Smith v. Jones",
      requests: [
        { number: 1, text: "State the date of the incident" },
      ],
    };
    const result = extractionResponseSchema.parse(valid);
    expect(result.discovery_type).toBe("interrogatory");
  });

  it("rejects response with invalid discovery_type", () => {
    const invalid = {
      discovery_type: "unknown",
      case_name: "Test Case",
      requests: [],
    };
    expect(() => extractionResponseSchema.parse(invalid)).toThrow();
  });

  it("accepts null case_name", () => {
    const valid = {
      discovery_type: "rfp",
      case_name: null,
      requests: [{ number: 1, text: "Produce all documents" }],
    };
    const result = extractionResponseSchema.parse(valid);
    expect(result.case_name).toBeNull();
  });

  it("rejects request with missing text field", () => {
    const invalid = {
      discovery_type: "rfp",
      case_name: "Test",
      requests: [{ number: 1 }],
    };
    expect(() => extractionResponseSchema.parse(invalid)).toThrow();
  });

  it("rejects request with non-integer number", () => {
    const invalid = {
      discovery_type: "rfp",
      case_name: "Test",
      requests: [{ number: 1.5, text: "Some request" }],
    };
    expect(() => extractionResponseSchema.parse(invalid)).toThrow();
  });
});

describe("EXTRACTION_JSON_SCHEMA", () => {
  it("has required fields: discovery_type, case_name, requests", () => {
    expect(EXTRACTION_JSON_SCHEMA.required).toContain("discovery_type");
    expect(EXTRACTION_JSON_SCHEMA.required).toContain("case_name");
    expect(EXTRACTION_JSON_SCHEMA.required).toContain("requests");
  });

  it("discovery_type enum equals ['rfp', 'interrogatory']", () => {
    expect(EXTRACTION_JSON_SCHEMA.properties.discovery_type.enum).toEqual([
      "rfp",
      "interrogatory",
    ]);
  });
});
