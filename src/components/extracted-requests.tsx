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
  Info,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { extractRequests } from "@/actions/extract";
import { deleteGeneratedResponses } from "@/actions/generate";
import { updateDocumentSubType, addDocument } from "@/actions/documents";
import { GeneratedResponse } from "@/components/generated-response";

type ExtractedRequest = {
  id: string;
  requestNumber: number;
  text: string;
  generatedResponse: {
    id: string;
    pattern: string;
    objectionTypes: string | null;
    responseText: string;
    crossReferenceNumber: number | null;
  }[];
};

type ExtractedRequestsProps = {
  requests: ExtractedRequest[];
  discoverySubType: string | null;
  documentId: string;
  caseId: string;
  hasComplaint: boolean;
};

export function ExtractedRequests({
  requests,
  discoverySubType,
  documentId,
  caseId,
  hasComplaint,
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

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    count: 0,
    total: 0,
  });
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  // Determine if responses already exist
  const hasResponses = currentRequests.some(
    (r) => r.generatedResponse && r.generatedResponse.length > 0
  );

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

  async function handleGenerate(startFrom?: number) {
    setIsGenerating(true);
    setGenerationError(null);
    setSavedCount(0);
    setGenerationProgress({ count: 0, total: currentRequests.length });

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          documentId,
          startFrom: startFrom || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body!
        .pipeThrough(new TextDecoderStream())
        .getReader();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const lines = value.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);
            if (event.type === "progress") {
              setGenerationProgress({
                count: event.count,
                total: event.total,
              });
            } else if (event.type === "complete") {
              setIsGenerating(false);
              setAnnouncement(
                `All ${event.responses.length} responses generated`
              );
              toast.success(
                `All ${event.responses.length} responses generated`
              );
              router.refresh();
            } else if (event.type === "error") {
              setIsGenerating(false);
              setGenerationError(event.message);
              setSavedCount(event.savedCount || 0);
              if (event.savedCount > 0) {
                router.refresh();
              }
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } catch {
      setIsGenerating(false);
      setGenerationError(
        "Could not generate responses. The AI service may be temporarily unavailable."
      );
    }
  }

  async function handleRegenerate() {
    const result = await deleteGeneratedResponses(documentId, caseId);
    if (result.success) {
      router.refresh();
      handleGenerate();
    } else {
      toast.error("Failed to clear old responses.");
    }
  }

  function handleContinueGeneration() {
    const lastSavedNumber = Math.max(
      ...currentRequests
        .filter((r) => r.generatedResponse && r.generatedResponse.length > 0)
        .map((r) => r.requestNumber),
      0
    );
    handleGenerate(lastSavedNumber + 1);
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
              const hasResponseForThis =
                req.generatedResponse && req.generatedResponse.length > 0;

              return (
                <div key={req.id}>
                  {/* Request row */}
                  <div
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
                    className={`${
                      hasResponseForThis ? "rounded-t-md" : "rounded"
                    } border border-border bg-card p-4 hover:bg-secondary ${
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

                  {/* Inline generated response block */}
                  {hasResponseForThis && (
                    <GeneratedResponse
                      pattern={req.generatedResponse[0].pattern}
                      objectionTypes={req.generatedResponse[0].objectionTypes}
                      responseText={req.generatedResponse[0].responseText}
                      crossReferenceNumber={
                        req.generatedResponse[0].crossReferenceNumber
                      }
                    />
                  )}

                  {/* Skeleton placeholder during generation */}
                  {isGenerating && !hasResponseForThis && (
                    <div className="rounded-b-md border-x border-b border-border bg-card p-4">
                      <Skeleton className="h-3.5 w-full rounded" />
                      <Skeleton className="mt-2 h-3.5 w-[80%] rounded" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Limitation banner -- shown when no complaint is uploaded */}
      {!hasComplaint && (showRequests || hasResponses) && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 flex items-start gap-2 rounded border border-border bg-muted p-4"
        >
          <Info
            size={16}
            className="mt-0.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm text-muted-foreground">
              Responses generated without complaint context.
            </p>
            <p className="text-sm text-muted-foreground">
              Upload a complaint and re-generate for better results.
            </p>
          </div>
        </div>
      )}

      {/* Generation controls area */}
      {showRequests && !isGenerating && !generationError && (
        <>
          {/* Generate Responses button -- when no responses exist */}
          {!hasResponses && (
            <Button
              className="mt-4 h-11 w-full bg-[#C8653A] font-semibold text-white hover:bg-[#C8653A]/80"
              onClick={() => handleGenerate()}
              aria-label="Generate responses for all extracted requests"
            >
              Generate Responses
            </Button>
          )}

          {/* Re-generate button -- when responses exist */}
          {hasResponses && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    variant="outline"
                    className="mt-4 h-11 w-full text-sm font-semibold"
                  >
                    <RefreshCw size={14} />
                    Re-generate All Responses
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Re-generate all responses?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all existing responses and generate new
                    ones. Any previous responses will be permanently replaced.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRegenerate}>
                    Re-generate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </>
      )}

      {/* Generating state -- streaming progress */}
      {isGenerating && (
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Generating responses...
            </span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {generationProgress.count} of {generationProgress.total}
            </span>
          </div>
          <Progress
            value={
              generationProgress.total > 0
                ? (generationProgress.count / generationProgress.total) * 100
                : 0
            }
            className="mt-2 h-1"
          />
          <div className="mt-2 flex items-center justify-center gap-2">
            <Loader2
              size={14}
              className="animate-spin text-[#C8653A]"
            />
            <span className="text-sm text-muted-foreground">
              This may take up to a minute...
            </span>
          </div>
        </div>
      )}

      {/* Error state with partial save (D-13) */}
      {generationError && savedCount > 0 && (
        <div
          className="mt-4 rounded border border-border bg-card p-4"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-destructive" />
            <span className="text-sm text-foreground">
              Generation stopped after {savedCount} of{" "}
              {currentRequests.length} responses. Some responses were saved.
            </span>
          </div>
          <Button
            variant="outline"
            className="mt-4 h-11 w-full text-sm font-semibold"
            onClick={handleContinueGeneration}
          >
            <Play size={14} />
            Continue Generation
          </Button>
        </div>
      )}

      {/* Error state with zero save */}
      {generationError && savedCount === 0 && (
        <div
          className="mt-4 rounded border border-border p-6 text-center"
          role="alert"
        >
          <AlertCircle size={24} className="mx-auto text-destructive" />
          <p className="mt-2 text-sm text-foreground">
            Could not generate responses. The AI service may be temporarily
            unavailable.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => handleGenerate()}
          >
            <RefreshCw size={14} />
            Retry
          </Button>
        </div>
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
