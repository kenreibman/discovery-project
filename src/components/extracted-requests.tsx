"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { extractRequests } from "@/actions/extract";
import { updateDocumentSubType, addDocument } from "@/actions/documents";

type ExtractedRequest = {
  id: string;
  requestNumber: number;
  text: string;
};

type ExtractedRequestsProps = {
  requests: ExtractedRequest[];
  discoverySubType: string | null;
  documentId: string;
  caseId: string;
};

export function ExtractedRequests({
  requests,
  discoverySubType,
  documentId,
  caseId,
}: ExtractedRequestsProps) {
  const router = useRouter();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [currentRequests, setCurrentRequests] =
    useState<ExtractedRequest[]>(requests);
  const [currentSubType, setCurrentSubType] = useState<string | null>(
    discoverySubType
  );
  const [announcement, setAnnouncement] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTriggeredRef = useRef(false);

  // Sync local state when server data changes (e.g., after router.refresh())
  useEffect(() => {
    setCurrentRequests(requests);
  }, [requests]);

  useEffect(() => {
    setCurrentSubType(discoverySubType);
  }, [discoverySubType]);

  // Auto-trigger extraction when mounted with no requests (e.g., after case creation from dashboard)
  useEffect(() => {
    if (requests.length === 0 && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      handleReExtract();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleReExtract() {
    setIsExtracting(true);
    setExtractionError(null);
    setCurrentRequests([]);
    const result = await extractRequests(documentId, caseId);
    setIsExtracting(false);
    if (result.success) {
      setAnnouncement(`${result.requestCount} requests extracted`);
      router.refresh();
    } else {
      setExtractionError(result.error);
    }
  }

  function handleUploadNew() {
    fileInputRef.current?.click();
  }

  async function handleNewFileSelected(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    e.target.value = "";

    setIsExtracting(true);
    setExtractionError(null);
    setCurrentRequests([]);

    try {
      const blob = await upload(file.name, file, {
        access: "private",
        handleUploadUrl: "/api/upload",
        multipart: true,
      });

      const doc = await addDocument(caseId, {
        blobUrl: blob.url,
        filename: file.name,
        type: "discovery_request",
        mimeType: file.type,
      });

      const result = await extractRequests(doc.id, caseId);
      setIsExtracting(false);
      if (result.success) {
        setAnnouncement(`${result.requestCount} requests extracted`);
        router.refresh();
      } else {
        setExtractionError(result.error);
      }
    } catch {
      setIsExtracting(false);
      setExtractionError(
        "Could not extract requests from this PDF. The document may be a poor-quality scan."
      );
    }
  }

  // Loading skeleton state
  const showLoading = isExtracting && currentRequests.length === 0;
  // Error state
  const showError = !isExtracting && extractionError !== null;
  // Populated list
  const showRequests =
    !isExtracting && !extractionError && currentRequests.length > 0;

  return (
    <div>
      {/* Section header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Extracted Requests
          </h3>
          {currentSubType && !isExtracting && (
            <Select
              value={currentSubType}
              onValueChange={async (val) => {
                const newType = val as "rfp" | "interrogatory";
                setCurrentSubType(newType);
                await updateDocumentSubType(documentId, newType, caseId);
              }}
            >
              <SelectTrigger
                className="h-auto border-none bg-transparent p-0"
                aria-label="Discovery type"
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer text-sm uppercase"
                >
                  {currentSubType === "rfp" ? "RFP" : "Interrogatory"}
                </Badge>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rfp">RFP</SelectItem>
                <SelectItem value="interrogatory">Interrogatory</SelectItem>
              </SelectContent>
            </Select>
          )}
          {!isExtracting && currentRequests.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({currentRequests.length})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReExtract}
          disabled={isExtracting}
          aria-label="Re-extract requests from document"
        >
          <RefreshCw
            size={14}
            className={isExtracting ? "animate-spin" : ""}
          />
          Re-extract
        </Button>
      </div>

      {/* Request list area */}
      <div className="mt-4">
        {/* Loading skeleton state */}
        {showLoading && (
          <div
            aria-busy="true"
            aria-label="Extracting requests from document"
          >
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded border border-border p-4"
                >
                  <Skeleton className="h-3.5 w-[80%] rounded" />
                  <Skeleton className="mt-2 h-3.5 w-[60%] rounded" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Loader2
                size={14}
                className="animate-spin text-[#C8653A]"
              />
              <span
                className="text-sm text-muted-foreground"
                aria-live="polite"
              >
                Extracting requests...
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {showError && (
          <div
            role="alert"
            className="rounded border border-border p-6 text-center"
          >
            <AlertCircle
              size={24}
              className="mx-auto text-destructive"
            />
            <p className="mt-2 text-sm text-foreground">
              {extractionError}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReExtract}
              >
                <RefreshCw size={14} />
                Retry Extraction
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUploadNew}
              >
                <Upload size={14} />
                Upload new
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleNewFileSelected}
            />
          </div>
        )}

        {/* Populated request rows */}
        {showRequests && (
          <div role="list" className="space-y-1">
            {currentRequests.map((req) => {
              const isLong = req.text.length > 100;
              const isExpanded = expandedIds.has(req.id);

              return (
                <div
                  key={req.id}
                  role={isLong ? "button" : "listitem"}
                  tabIndex={isLong ? 0 : undefined}
                  aria-expanded={isLong ? isExpanded : undefined}
                  onClick={() => isLong && toggleExpand(req.id)}
                  onKeyDown={(e) => {
                    if (
                      isLong &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      toggleExpand(req.id);
                    }
                  }}
                  className={`rounded border border-border bg-card p-4 hover:bg-secondary ${
                    isLong ? "cursor-pointer" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* Chevron */}
                    {isLong ? (
                      isExpanded ? (
                        <ChevronDown
                          size={16}
                          className="mt-0.5 shrink-0 text-muted-foreground"
                        />
                      ) : (
                        <ChevronRight
                          size={16}
                          className="mt-0.5 shrink-0 text-muted-foreground"
                        />
                      )
                    ) : (
                      <div className="w-4" />
                    )}
                    {/* Request number */}
                    <span className="w-6 shrink-0 text-right text-sm text-muted-foreground">
                      {req.requestNumber}.
                    </span>
                    {/* Text */}
                    <p className="text-sm text-foreground">
                      {isExpanded
                        ? req.text
                        : isLong
                          ? req.text.slice(0, 100) + "..."
                          : req.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate Responses button */}
      {(showRequests || showLoading) && (
        <Button
          className="mt-4 h-11 w-full cursor-not-allowed bg-[#C8653A] font-semibold text-white opacity-50"
          disabled
          aria-disabled="true"
          aria-label="Generate Responses - coming soon"
          title="Coming soon"
        >
          Generate Responses
        </Button>
      )}

      {/* Hidden file input (for Upload new in non-error contexts) */}
      {!showError && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleNewFileSelected}
        />
      )}

      {/* Screen reader announcement region */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
