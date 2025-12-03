"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/upload-dropzone";
import { FileUploadProgress } from "@/components/file-upload-progress";
import { useDocumentStore } from "@/lib/stores/document-store";
import { useAuditStore } from "@/lib/stores/audit-store";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "sonner";

export default function NewDocumentPage() {
  const router = useRouter();
  const { addDocument } = useDocumentStore();
  const { addLog } = useAuditStore();
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Por favor, selecione um arquivo PDF");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Mock: Simular upload
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    // Simular delay de upload
    await new Promise((resolve) => setTimeout(resolve, 2000));

    clearInterval(progressInterval);
    setUploadProgress(100);

    // Mock: Criar documento
    const newDocument = {
      name: file.name.replace(".pdf", ""),
      fileName: file.name,
      fileSize: file.size,
      pageCount: Math.floor(Math.random() * 20) + 1, // Mock: 1-20 páginas
      status: "pending_config" as const,
      signers: [],
      hash: `sha256:${Math.random().toString(36).substring(7)}`, // Mock hash
    };

    addDocument(newDocument);
    addLog({
      userId: user?.id || "unknown",
      userName: user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.firstName || user?.email || "Unknown",
      action: "upload",
      ip: "192.168.1.1",
      documentName: newDocument.name,
    });

    toast.success("Documento enviado com sucesso!");
    
    // Redirecionar para configuração de signatários
    setTimeout(() => {
      const documents = useDocumentStore.getState().documents;
      const uploadedDoc = documents.find((d) => d.fileName === file.name);
      if (uploadedDoc) {
        router.push(`/documentos/${uploadedDoc.id}/signatarios`);
      }
    }, 500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Documento"
        description="Faça upload de um documento PDF para assinatura digital"
        breadcrumbs={[
          { label: "Documentos", href: "/documentos" },
          { label: "Novo" },
        ]}
      />

      <div className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Selecione o arquivo PDF</h3>
          <UploadDropzone
            accept=".pdf"
            maxSize={50 * 1024 * 1024} // 50MB
            onFileSelect={handleFileSelect}
            disabled={isUploading}
          />
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <FileUploadProgress progress={uploadProgress} />
        )}

        {file && uploadProgress === 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isUploading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? "Enviando..." : "Continuar para Signatários"}
          </Button>
        </div>
      </div>
    </div>
  );
}

