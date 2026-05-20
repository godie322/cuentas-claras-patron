"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Eye } from "lucide-react";

interface ReceiptUploadProps {
  onFileSelect: (file: File | null) => void;
  currentUrl?: string | null;
}

export function ReceiptUpload({ onFileSelect, currentUrl }: ReceiptUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
    onFileSelect(file);
  }

  function handleRemove() {
    setPreview(null);
    setFileName(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={handleChange}
      />
      {!fileName && !currentUrl ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4 mr-1" />
          Adjuntar comprobante
        </Button>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          {preview && (
            <a href={preview} target="_blank" rel="noreferrer">
              <img
                src={preview}
                alt="comprobante"
                className="h-10 w-10 rounded object-cover border"
              />
            </a>
          )}
          {!preview && (
            <a
              href={currentUrl ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-blue-600 underline"
            >
              <Eye className="h-4 w-4" />
              {fileName ?? "Ver comprobante"}
            </a>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
