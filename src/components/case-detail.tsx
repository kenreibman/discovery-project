"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { upload } from "@vercel/blob/client";
import {
  ArrowLeft,
  FileText,
  Plus,
  MoreVertical,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { FileRow, type FileUploadState } from "@/components/file-row";

import { renameCase, deleteCase } from "@/actions/cases";
import { addDocument, removeDocument, updateDocumentType } from "@/actions/documents";
import { classifyDocument } from "@/actions/classify";
import { validateFile } from "@/lib/upload";

const TYPE_LABELS: Record<string, string> = {
  complaint: "Complaint",
  discovery_request: "Discovery Request",
};

type CaseDetailProps = {
  caseData: {
    id: string;
    name: string | null;
    createdAt: Date | null;
    documents: {
      id: string;
      type: string;
      filename: string;
      blobUrl: string;
      mimeType: string | null;
      uploadedAt: Date | null;
    }[];
  };
};

function formatRelativeDate(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function CaseDetail({ caseData }: CaseDetailProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(caseData.name || "");
  const [previousName, setPreviousName] = useState(caseData.name || "");
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<FileUploadState[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFileState = useCallback(
    (id: string, updates: Partial<FileUploadState>) => {
      setPendingUploads((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  async function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(previousName);
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    setPreviousName(trimmed);
    setName(trimmed);
    await renameCase(caseData.id, trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setName(previousName);
      setIsEditing(false);
    }
  }

  async function handleDeleteCase() {
    setIsDeleting(true);
    try {
      await deleteCase(caseData.id);
    } catch {
      toast.error("Failed to delete case.");
      setIsDeleting(false);
    }
  }

  async function handleRemoveDocument(documentId: string) {
    await removeDocument(documentId, caseData.id);
    router.refresh();
  }

  async function handleUpdateDocumentType(
    documentId: string,
    newType: "complaint" | "discovery_request"
  ) {
    await updateDocumentType(documentId, newType, caseData.id);
    router.refresh();
  }

  function handleAddDocumentsClick() {
    fileInputRef.current?.click();
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;

    const fileList = e.target.files;
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

    setPendingUploads((prev) => [...prev, ...newFiles]);

    // Reset input so same files can be selected again
    e.target.value = "";

    // Upload valid files
    for (const fileState of newFiles.filter((f) => f.status === "uploading")) {
      uploadAndClassify(fileState);
    }
  }

  async function uploadAndClassify(fileState: FileUploadState) {
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

      let docType: "complaint" | "discovery_request" = "discovery_request";
      try {
        const classification = await classifyDocument(blob.url);
        docType = classification.type;
      } catch {
        toast.error("Could not detect file type. Select type manually.");
      }

      // Add document to the case
      await addDocument(caseData.id, {
        blobUrl: blob.url,
        filename: fileState.file.name,
        type: docType,
        mimeType: fileState.file.type,
      });

      // Remove from pending uploads and refresh to show in document list
      setPendingUploads((prev) => prev.filter((f) => f.id !== fileState.id));
      router.refresh();
    } catch {
      updateFileState(fileState.id, {
        status: "error",
        error: "Upload failed. Click to retry.",
      });
    }
  }

  function handleRetry(id: string) {
    const fileState = pendingUploads.find((f) => f.id === id);
    if (!fileState) return;
    updateFileState(id, { status: "uploading", progress: 0, error: undefined });
    uploadAndClassify({ ...fileState, status: "uploading", progress: 0 });
  }

  function handleRemovePending(id: string) {
    setPendingUploads((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="pt-12">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      {/* Case name */}
      <div className="mt-6">
        {isEditing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={handleKeyDown}
            className="text-2xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
            aria-label="Case name"
            autoFocus
          />
        ) : (
          <h1
            className={`cursor-pointer text-2xl font-semibold ${
              name ? "text-foreground" : "text-muted-foreground"
            }`}
            onClick={() => {
              setPreviousName(name);
              setIsEditing(true);
            }}
          >
            {name || "Untitled Case"}
          </h1>
        )}
      </div>

      {/* Case metadata */}
      <p className="mt-2 text-sm text-muted-foreground">
        Created{" "}
        {caseData.createdAt
          ? new Date(caseData.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "Unknown"}
      </p>

      {/* Documents section */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Documents</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddDocumentsClick}
          >
            <Plus size={14} />
            Add Documents
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
        </div>

        {/* Pending uploads */}
        {pendingUploads.length > 0 && (
          <div className="mt-4" role="list">
            {pendingUploads.map((fileState) => (
              <FileRow
                key={fileState.id}
                state={fileState}
                onTypeChange={() => {}}
                onRetry={() => handleRetry(fileState.id)}
                onRemove={() => handleRemovePending(fileState.id)}
              />
            ))}
          </div>
        )}

        {/* Existing document list */}
        <div className="mt-4">
          {caseData.documents.length === 0 && pendingUploads.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No documents yet. Click &quot;Add Documents&quot; to upload files.
            </p>
          )}
          {caseData.documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center border-b border-border py-4"
            >
              <FileText size={20} className="shrink-0 text-muted-foreground" />
              <span className="ml-2 max-w-[300px] truncate text-base text-foreground">
                {doc.filename}
              </span>
              <div className="flex-grow" />
              <Select
                value={doc.type}
                onValueChange={(val) =>
                  handleUpdateDocumentType(
                    doc.id,
                    val as "complaint" | "discovery_request"
                  )
                }
              >
                <SelectTrigger
                  className="h-auto border-none bg-transparent p-0"
                  aria-label={`File type for ${doc.filename}`}
                >
                  <Badge variant="secondary" className="cursor-pointer text-sm">
                    {TYPE_LABELS[doc.type] || doc.type}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="discovery_request">
                    Discovery Request
                  </SelectItem>
                </SelectContent>
              </Select>
              <span className="ml-2 text-sm text-muted-foreground">
                {formatRelativeDate(doc.uploadedAt)}
              </span>
              <div className="ml-2">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label={`Actions for ${doc.filename}`}
                  >
                    <MoreVertical size={16} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleRemoveDocument(doc.id)}
                    >
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="mt-12">
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={14} />
                Delete Case
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this case?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the case and all its documents.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={handleDeleteCase}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                )}
                Delete Case
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
