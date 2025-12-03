"use client";

import { useCallback, useState } from "react";
import { UploadCloud, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UploadDropzoneProps {
  accept?: string;
  maxSize?: number; // em bytes
  onFileSelect: (file: File) => void;
  onError?: (error: string) => void;
  className?: string;
  disabled?: boolean;
}

export function UploadDropzone({
  accept = ".pdf",
  maxSize = 10 * 1024 * 1024, // 10MB padrão
  onFileSelect,
  onError,
  className,
  disabled,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    // Validar extensão
    const extension = file.name.split(".").pop()?.toLowerCase();
    const acceptedExtensions = accept
      .split(",")
      .map((ext) => ext.trim().replace(".", ""));

    if (!extension || !acceptedExtensions.includes(extension)) {
      const errorMsg = `Arquivo deve ser do tipo: ${accept}`;
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }

    // Validar tamanho
    if (file.size > maxSize) {
      const errorMsg = `Arquivo muito grande. Tamanho máximo: ${formatFileSize(maxSize)}`;
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className={cn("w-full", className)}>
      {selectedFile ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <File className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={removeFile}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-8 transition-colors",
            isDragging && "border-primary bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed",
            error && "border-destructive"
          )}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            disabled={disabled}
          />
          <UploadCloud
            className={cn(
              "h-10 w-10 text-muted-foreground mb-4",
              isDragging && "text-primary"
            )}
          />
          <p className="text-sm font-medium mb-1">
            Arraste e solte o arquivo aqui
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            ou clique para selecionar
          </p>
          <p className="text-xs text-muted-foreground">
            {accept} (máx. {formatFileSize(maxSize)})
          </p>
          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}

