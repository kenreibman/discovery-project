"use client";

import { FileText, Loader2, Check, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFileSize } from "@/lib/upload";

export type FileUploadState = {
  id: string;
  file: File;
  status: "uploading" | "classifying" | "extracting" | "done" | "error";
  progress: number;
  blobUrl?: string;
  type?: "complaint" | "discovery_request";
  error?: string;
};

type FileRowProps = {
  state: FileUploadState;
  onTypeChange: (type: "complaint" | "discovery_request") => void;
  onRetry: () => void;
  onRemove: () => void;
};

const TYPE_LABELS: Record<string, string> = {
  complaint: "Complaint",
  discovery_request: "Discovery Request",
};

export function FileRow({ state, onTypeChange, onRetry, onRemove }: FileRowProps) {
  return (
    <div
      role="listitem"
      className="group flex items-center border-b border-[#E5E0D8] py-4"
    >
      {/* File icon */}
      <FileText size={20} className="shrink-0 text-muted-foreground" />

      {/* File info */}
      <div className="ml-2 min-w-0 flex-grow">
        <p className="max-w-[300px] truncate text-base text-foreground">
          {state.file.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatFileSize(state.file.size)}
        </p>
      </div>

      {/* Type badge area */}
      <div className="ml-2 shrink-0">
        {state.status === "classifying" && (
          <Skeleton className="h-6 w-20 rounded" />
        )}
        {state.status === "done" && state.type && (
          <Select
            value={state.type}
            onValueChange={(val) =>
              onTypeChange(val as "complaint" | "discovery_request")
            }
          >
            <SelectTrigger
              className="h-auto border-none bg-transparent p-0"
              aria-label={`File type for ${state.file.name}`}
            >
              <Badge variant="secondary" className="cursor-pointer text-sm">
                {TYPE_LABELS[state.type]}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="complaint">Complaint</SelectItem>
              <SelectItem value="discovery_request">
                Discovery Request
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Status area */}
      <div className="ml-2 flex min-w-[120px] shrink-0 items-center justify-end">
        {state.status === "uploading" && (
          <div className="w-[120px]">
            <Progress value={state.progress} className="h-1" />
            <p className="mt-1 text-right text-sm text-muted-foreground">
              {Math.round(state.progress)}%
            </p>
          </div>
        )}
        {state.status === "classifying" && (
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">
              Classifying...
            </span>
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        )}
        {state.status === "extracting" && (
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">
              Extracting...
            </span>
            <Loader2 size={14} className="animate-spin text-[#C8653A]" />
          </div>
        )}
        {state.status === "done" && (
          <div className="flex items-center gap-2">
            <Check size={16} className="text-[#16A34A]" />
            <button
              type="button"
              onClick={onRemove}
              className="text-sm text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
              aria-label={`Remove ${state.file.name}`}
            >
              &times;
            </button>
          </div>
        )}
        {state.status === "error" && (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <AlertCircle size={16} className="text-destructive" />
              <span className="text-sm text-destructive">{state.error}</span>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="text-sm text-[#C8653A] hover:underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
