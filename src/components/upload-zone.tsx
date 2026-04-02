"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { validateFile } from "@/lib/upload";
import { classifyDocument } from "@/actions/classify";
import { createCase } from "@/actions/cases";
import { FileRow, type FileUploadState } from "@/components/file-row";

export function UploadZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isActive = isDragOver || isHovered;

  const updateFileState = useCallback(
    (id: string, updates: Partial<FileUploadState>) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const uploadSingleFile = useCallback(
    async (fileState: FileUploadState) => {
      try {
        const blob = await upload(fileState.file.name, fileState.file, {
          access: "private",
          handleUploadUrl: "/api/upload",
          multipart: true,
          onUploadProgress: ({ percentage }) => {
            updateFileState(fileState.id, { progress: percentage });
          },
        });

        updateFileState(fileState.id, {
          status: "classifying",
          blobUrl: blob.url,
          progress: 100,
        });

        try {
          const classification = await classifyDocument(blob.url);
          updateFileState(fileState.id, {
            status: "done",
            type: classification.type,
          });
        } catch {
          updateFileState(fileState.id, {
            status: "done",
            type: "discovery_request",
          });
          toast.error("Could not detect file type. Select type manually.");
        }
      } catch {
        updateFileState(fileState.id, {
          status: "error",
          error: "Upload failed. Click to retry.",
        });
      }
    },
    [updateFileState]
  );

  function handleFiles(fileList: FileList) {
    const newFiles: FileUploadState[] = [];

    Array.from(fileList).forEach((file) => {
      const validationError = validateFile(file);
      const id = crypto.randomUUID();

      if (validationError) {
        newFiles.push({
          id,
          file,
          status: "error",
          progress: 0,
          error: validationError.message,
        });
      } else {
        newFiles.push({
          id,
          file,
          status: "uploading",
          progress: 0,
        });
      }
    });

    setFiles((prev) => [...prev, ...newFiles]);

    // Upload valid files in parallel
    newFiles
      .filter((f) => f.status === "uploading")
      .forEach((f) => {
        uploadSingleFile(f);
      });
  }

  function handleRetry(id: string) {
    const fileState = files.find((f) => f.id === id);
    if (!fileState) return;

    updateFileState(id, { status: "uploading", progress: 0, error: undefined });
    uploadSingleFile({ ...fileState, status: "uploading", progress: 0 });
  }

  function handleRemove(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleTypeChange(id: string, type: "complaint" | "discovery_request") {
    updateFileState(id, { type });
  }

  async function handleCreateCase() {
    const doneFiles = files.filter((f) => f.status === "done" && f.blobUrl);
    if (doneFiles.length === 0) return;

    setIsCreating(true);

    try {
      const documentData = doneFiles.map((f) => ({
        blobUrl: f.blobUrl!,
        filename: f.file.name,
        type: f.type || "discovery_request",
        mimeType: f.file.type,
      }));

      const result = await createCase(documentData);
      router.push(`/case/${result.id}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create case."
      );
      setIsCreating(false);
    }
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  const allProcessed =
    files.length > 0 &&
    files.every((f) => f.status === "done" || f.status === "error");
  const hasDoneFiles = files.some((f) => f.status === "done");
  const showCreateCase = allProcessed && hasDoneFiles;

  return (
    <div>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center rounded-xl py-12 transition-all ${
          isDragOver
            ? "border-2 border-solid border-[#C8653A] bg-[#C8653A08]"
            : isHovered
              ? "border-2 border-dashed border-[#C8653A] bg-[#C8653A08]"
              : "border-2 border-dashed border-[#E5E0D8]"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <Upload
          size={32}
          className={`text-muted-foreground ${isActive ? "text-[#C8653A]" : ""}`}
        />
        <p className="mt-4 text-base text-muted-foreground">
          Drop files here or click to browse
        </p>
        <p className="mt-2 text-sm text-muted-foreground opacity-70">
          PDF files up to 20MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFiles(e.target.files);
              // Reset input so the same files can be selected again
              e.target.value = "";
            }
          }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-8" role="list">
          {files.map((fileState) => (
            <FileRow
              key={fileState.id}
              state={fileState}
              onTypeChange={(type) => handleTypeChange(fileState.id, type)}
              onRetry={() => handleRetry(fileState.id)}
              onRemove={() => handleRemove(fileState.id)}
            />
          ))}
        </div>
      )}

      {/* Create Case button */}
      {showCreateCase && (
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={handleCreateCase}
            disabled={isCreating}
            className="inline-flex h-[44px] items-center gap-2 rounded-lg bg-[#C8653A] px-6 text-base font-semibold text-white transition-colors hover:bg-[#B55A33] disabled:opacity-50"
          >
            {isCreating && <Loader2 size={16} className="animate-spin" />}
            {isCreating ? "Creating..." : "Create Case"}
          </button>
        </div>
      )}
    </div>
  );
}
