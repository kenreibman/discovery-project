export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const ACCEPTED_MIME_TYPES = ["application/pdf"] as const;

export type FileValidationError = {
  file: File;
  reason: "too_large" | "wrong_type";
  message: string;
};

export function validateFile(file: File): FileValidationError | null {
  if (!(ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return {
      file,
      reason: "wrong_type",
      message: `${file.name} is not a PDF file.`,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      file,
      reason: "too_large",
      message: `${file.name} exceeds the 20MB file size limit.`,
    };
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
