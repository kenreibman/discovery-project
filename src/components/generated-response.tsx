"use client";

import { Badge } from "@/components/ui/badge";

type GeneratedResponseProps = {
  pattern: string;
  objectionTypes: string | null; // JSON string from DB
  responseText: string;
  crossReferenceNumber: number | null;
};

const PATTERN_LABELS: Record<string, string> = {
  produced_all: "Produced All",
  no_such_documents: "No Such Documents",
  objection: "Objection",
  cross_reference: "Cross-Reference",
};

const OBJECTION_LABELS: Record<string, string> = {
  privilege: "Privilege",
  overbroad_irrelevant: "Overbroad",
  premature: "Premature",
  compound: "Compound",
};

export function GeneratedResponse({
  pattern,
  objectionTypes,
  responseText,
  crossReferenceNumber,
}: GeneratedResponseProps) {
  // Parse objection types from JSON string stored in DB
  const parsedTypes: string[] | null = objectionTypes
    ? (JSON.parse(objectionTypes) as string[])
    : null;

  // Split response text on double newlines to preserve paragraph breaks
  const paragraphs = responseText.split("\n\n").filter((p) => p.trim());

  return (
    <div className="rounded-b-md border-x border-b border-border bg-card p-4">
      {/* Badge row */}
      <div className="flex items-center gap-1" aria-hidden="true">
        <Badge variant="secondary">
          {PATTERN_LABELS[pattern] || pattern}
        </Badge>
        {pattern === "objection" && parsedTypes && parsedTypes.length > 0 && (
          <>
            {parsedTypes.map((type) => (
              <Badge key={type} variant="secondary" className="ml-1">
                {OBJECTION_LABELS[type] || type}
              </Badge>
            ))}
          </>
        )}
        {pattern === "cross_reference" && crossReferenceNumber && (
          <span className="ml-1 text-sm text-muted-foreground">
            See Request No. {crossReferenceNumber}
          </span>
        )}
      </div>

      {/* Response text */}
      <div className="mt-4 text-base leading-relaxed text-foreground">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="mb-4 last:mb-0">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
