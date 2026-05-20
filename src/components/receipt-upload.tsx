"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText } from "lucide-react";

interface FileEntry {
  file: File;
  preview: string | null; // object URL for images, null for PDFs
}

interface ReceiptUploadProps {
  onChange: (files: File[]) => void;
}

export function ReceiptUpload({ onChange }: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;

    const newEntries: FileEntry[] = picked.map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));

    setEntries((prev) => {
      const updated = [...prev, ...newEntries];
      onChange(updated.map((e) => e.file));
      return updated;
    });

    // Reset input so the same file can be picked again if needed
    e.target.value = "";
  }

  function handleRemove(index: number) {
    setEntries((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onChange(updated.map((e) => e.file));
      return updated;
    });
  }

  return (
    <div className="space-y-2">
      {/* Thumbnails / file list */}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entries.map((entry, i) => (
            <div
              key={i}
              className="relative group flex items-center gap-1.5 rounded-md border bg-muted/40 p-1.5 pr-2 text-sm"
            >
              {entry.preview ? (
                <a href={entry.preview} target="_blank" rel="noreferrer">
                  <img
                    src={entry.preview}
                    alt="comprobante"
                    className="h-10 w-10 rounded object-cover border"
                  />
                </a>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded border bg-background">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <span className="max-w-[120px] truncate text-xs text-muted-foreground">
                {entry.file.name}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0 rounded-full"
                onClick={() => handleRemove(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-4 w-4 mr-1.5" />
        {entries.length === 0 ? "Adjuntar comprobante" : "Agregar otro"}
      </Button>
    </div>
  );
}
