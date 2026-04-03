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
