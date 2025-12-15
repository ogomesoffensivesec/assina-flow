"use client";

import { useState, useCallback } from "react";
import { UploadCloud, File, X, Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CertificateType } from "@/lib/stores/certificate-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface CertificateFile {
  id: string;
  file: File;
  password: string;
  type: CertificateType;
  name: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
  certificateId?: string;
}

interface BulkCertificateUploadProps {
  onUploadComplete?: () => void;
}

export function BulkCertificateUpload({ onUploadComplete }: BulkCertificateUploadProps) {
  const [certificates, setCertificates] = useState<CertificateFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const validateFile = (file: File): boolean => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "pfx" && extension !== "p12") {
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      return false;
    }
    return true;
  };

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(validateFile);

    const newCertificates: CertificateFile[] = validFiles.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      password: "",
      type: "PJ" as CertificateType,
      name: file.name.replace(/\.(pfx|p12)$/i, ""),
      status: "pending" as const,
    }));

    setCertificates((prev) => [...prev, ...newCertificates]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (isUploading) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [isUploading, handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isUploading) {
      setIsDragging(true);
    }
  }, [isUploading]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const removeCertificate = (id: string) => {
    setCertificates((prev) => prev.filter((c) => c.id !== id));
    setShowPasswords((prev) => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const updateCertificate = (id: string, updates: Partial<CertificateFile>) => {
    setCertificates((prev) =>
      prev.map((cert) => (cert.id === id ? { ...cert, ...updates } : cert))
    );
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpload = async () => {
    // Validar que todos têm senha
    const certificatesWithoutPassword = certificates.filter((c) => !c.password.trim());
    if (certificatesWithoutPassword.length > 0) {
      toast.error(`Por favor, preencha a senha de todos os certificados`);
      return;
    }

    setIsUploading(true);

    // Processar cada certificado individualmente
    for (const cert of certificates) {
      updateCertificate(cert.id, { status: "processing" });

      try {
        const formData = new FormData();
        formData.append("file", cert.file);
        formData.append("name", cert.name);
        formData.append("type", cert.type);
        formData.append("password", cert.password);

        const response = await fetch("/api/certificados", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao fazer upload do certificado");
        }

        const certificate = await response.json();
        updateCertificate(cert.id, {
          status: "success",
          certificateId: certificate.id,
        });
      } catch (error: any) {
        updateCertificate(cert.id, {
          status: "error",
          error: error.message || "Erro desconhecido",
        });
      }
    }

    setIsUploading(false);
    onUploadComplete?.();
  };

  const successCount = certificates.filter((c) => c.status === "success").length;
  const errorCount = certificates.filter((c) => c.status === "error").length;
  const pendingCount = certificates.filter((c) => c.status === "pending").length;
  const processingCount = certificates.filter((c) => c.status === "processing").length;

  return (
    <div className="space-y-6">
      {certificates.length === 0 ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-8 transition-colors",
            isDragging && "border-primary bg-primary/5",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            type="file"
            accept=".pfx,.p12"
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            disabled={isUploading}
          />
          <UploadCloud
            className={cn(
              "h-10 w-10 text-muted-foreground mb-4",
              isDragging && "text-primary"
            )}
          />
          <p className="text-sm font-medium mb-1">
            Arraste e solte os arquivos aqui
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            ou clique para selecionar múltiplos arquivos
          </p>
          <p className="text-xs text-muted-foreground">
            .pfx ou .p12 (máx. 5MB cada)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {certificates.length} certificado{certificates.length !== 1 ? "s" : ""} selecionado
                {certificates.length !== 1 ? "s" : ""}
              </h3>
              {isUploading && (
                <p className="text-sm text-muted-foreground">
                  Processando... {processingCount > 0 && `${processingCount} em processamento`}
                </p>
              )}
              {!isUploading && certificates.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {successCount > 0 && `${successCount} sucesso`}
                  {successCount > 0 && errorCount > 0 && " • "}
                  {errorCount > 0 && `${errorCount} erro${errorCount !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>
            {!isUploading && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCertificates([]);
                  setShowPasswords({});
                }}
              >
                Limpar Tudo
              </Button>
            )}
          </div>

          {!isUploading && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/50 p-4 transition-colors",
                isDragging && "border-primary bg-primary/5"
              )}
            >
              <input
                type="file"
                accept=".pfx,.p12"
                multiple
                onChange={handleFileInput}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <UploadCloud className="h-6 w-6 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                Arraste mais arquivos ou clique para adicionar
              </p>
            </div>
          )}

          <div className="space-y-3">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className={cn(
                  "rounded-lg border p-4 space-y-3",
                  cert.status === "success" && "border-green-500 bg-green-50 dark:bg-green-950",
                  cert.status === "error" && "border-destructive bg-destructive/5",
                  cert.status === "processing" && "border-primary bg-primary/5"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <File className="h-5 w-5 text-muted-foreground mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cert.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(cert.file.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cert.status === "processing" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {cert.status === "success" && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {cert.status === "error" && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    {cert.status === "pending" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCertificate(cert.id)}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {cert.status === "error" && cert.error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-sm">{cert.error}</AlertDescription>
                  </Alert>
                )}

                {cert.status === "pending" && (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`name-${cert.id}`}>Nome Identificador</Label>
                      <Input
                        id={`name-${cert.id}`}
                        value={cert.name}
                        onChange={(e) =>
                          updateCertificate(cert.id, { name: e.target.value })
                        }
                        placeholder="Ex: Certificado Empresa ABC"
                        disabled={isUploading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`type-${cert.id}`}>Tipo</Label>
                      <Select
                        value={cert.type}
                        onValueChange={(value) =>
                          updateCertificate(cert.id, {
                            type: value as CertificateType,
                          })
                        }
                        disabled={isUploading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PF">Pessoa Física</SelectItem>
                          <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`password-${cert.id}`}>Senha</Label>
                      <div className="relative">
                        <Input
                          id={`password-${cert.id}`}
                          type={showPasswords[cert.id] ? "text" : "password"}
                          value={cert.password}
                          onChange={(e) =>
                            updateCertificate(cert.id, { password: e.target.value })
                          }
                          placeholder="Digite a senha do certificado"
                          disabled={isUploading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => togglePasswordVisibility(cert.id)}
                          disabled={isUploading}
                        >
                          {showPasswords[cert.id] ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {certificates.length > 0 && (
            <div className="flex items-center justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleUpload}
                disabled={
                  isUploading ||
                  certificates.some((c) => !c.password.trim()) ||
                  certificates.every((c) => c.status === "success" || c.status === "error")
                }
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Enviar Certificados"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

