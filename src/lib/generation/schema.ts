import { z } from "zod";

export const objectionTypeEnum = z.enum([
  "privilege",
  "overbroad_irrelevant",
  "premature",
  "compound",
]);

export const responsePatternEnum = z.enum([
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
export type ObjectionType = z.infer<typeof objectionTypeEnum>;
export type ResponsePattern = z.infer<typeof responsePatternEnum>;
