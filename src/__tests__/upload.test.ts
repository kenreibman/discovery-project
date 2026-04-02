import { describe, it, expect } from "vitest";
import { validateFile, MAX_FILE_SIZE, ACCEPTED_MIME_TYPES, formatFileSize } from "@/lib/upload";

describe("Upload validation (UPLD-01, UPLD-02)", () => {
  it("accepts a valid PDF file", () => {
    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    expect(validateFile(file)).toBeNull();
  });

  it("rejects non-PDF files", () => {
    const file = new File(["content"], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const result = validateFile(file);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe("wrong_type");
  });

  it("rejects files over 20MB", () => {
    // Create a file object with size > MAX_FILE_SIZE
    const largeContent = new Uint8Array(MAX_FILE_SIZE + 1);
    const file = new File([largeContent], "large.pdf", { type: "application/pdf" });
    const result = validateFile(file);
    expect(result).not.toBeNull();
    expect(result!.reason).toBe("too_large");
  });

  it("exports MAX_FILE_SIZE as 20MB", () => {
    expect(MAX_FILE_SIZE).toBe(20 * 1024 * 1024);
  });

  it("exports ACCEPTED_MIME_TYPES with application/pdf", () => {
    expect(ACCEPTED_MIME_TYPES).toContain("application/pdf");
  });

  it("formats file sizes correctly", () => {
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1024 * 512)).toBe("512.0 KB");
    expect(formatFileSize(1024 * 1024 * 5)).toBe("5.0 MB");
  });
});
