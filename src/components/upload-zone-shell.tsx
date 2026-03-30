"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

export function UploadZoneShell() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isActive = isDragOver || isHovered;

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
    // Phase 1: no file processing
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  return (
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
        accept=".pdf"
        className="hidden"
        onChange={() => {
          // Phase 1: no file processing
        }}
      />
    </div>
  );
}
