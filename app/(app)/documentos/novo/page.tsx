"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/components/upload-dropzone";
import { FileUploadProgress } from "@/components/file-upload-progress";
import { SignerSelectionModal } from "@/components/signer-selection-modal";
import { useAuditStore } from "@/lib/stores/audit-store";
import { useCertificateStore } from "@/lib/stores/certificate-store";
import { useDocumentStore } from "@/lib/stores/document-store";
import { useUser } from "@/lib/hooks/use-user";
import { toast } from "sonner";

export default function NewDocumentPage() {
  const router = useRouter();
  const { addLog } = useAuditStore();
  const { certificates, fetchCertificates } = useCertificateStore();
  const { fetchDocument } = useDocumentStore();
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);
  const [isSignerModalOpen, setIsSignerModalOpen] = useState(false);

  // Carregar certificados ao montar componente
  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleSignersComplete = async (signers: any[]) => {
    console.log("[DEBUG NewDoc] handleSignersComplete chamado:", {
      documentId: uploadedDocumentId,
      signersCount: signers.length,
    });

    if (!uploadedDocumentId) {
      console.error("[DEBUG NewDoc] uploadedDocumentId não está definido");
      return;
    }

    try {
      // Aguardar um pouco para garantir que o banco foi atualizado
      console.log("[DEBUG NewDoc] Aguardando atualização do banco...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Atualizar o documento no store antes de redirecionar
      console.log("[DEBUG NewDoc] Atualizando documento no store...");
      const updatedDoc = await fetchDocument(uploadedDocumentId);
      
      if (updatedDoc) {
        console.log("[DEBUG NewDoc] Documento atualizado no store:", {
          id: updatedDoc.id,
          status: updatedDoc.status,
          signersCount: updatedDoc.signers?.length || 0,
        });

        if (updatedDoc.signers && updatedDoc.signers.length > 0) {
          console.log("[DEBUG NewDoc] Signatários confirmados, redirecionando...");
          toast.success(`${updatedDoc.signers.length} signatário(s) configurado(s) com sucesso!`);
        } else {
          console.warn("[DEBUG NewDoc] Nenhum signatário encontrado no documento");
          toast.warning("Aguardando atualização dos signatários...");
          // Aguardar mais um pouco
          await new Promise((resolve) => setTimeout(resolve, 1000));
          // Tentar atualizar novamente
          const retryDoc = await fetchDocument(uploadedDocumentId);
          if (retryDoc?.signers && retryDoc.signers.length > 0) {
            toast.success(`${retryDoc.signers.length} signatário(s) configurado(s) com sucesso!`);
          }
        }
      } else {
        console.error("[DEBUG NewDoc] Erro ao atualizar documento no store");
        toast.warning("Redirecionando... Os signatários podem aparecer em alguns instantes.");
      }
      
      router.push(`/documentos/${uploadedDocumentId}`);
    } catch (error: any) {
      console.error("[DEBUG NewDoc] Erro em handleSignersComplete:", error);
      toast.error("Erro ao verificar signatários. Redirecionando...");
      router.push(`/documentos/${uploadedDocumentId}`);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Por favor, selecione um arquivo PDF");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Criar FormData para upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(".pdf", ""));

      // Fazer upload via API
      const response = await fetch("/api/documentos", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao fazer upload do documento");
      }

      const data = await response.json();
      
      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Aguardar um pouco para mostrar progresso
      await new Promise((resolve) => setTimeout(resolve, 1000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Adicionar log de auditoria
      addLog({
        userId: user?.id || "unknown",
        userName: user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.firstName || user?.email || "Unknown",
        action: "upload",
        ip: "192.168.1.1",
        documentName: data.name,
        documentId: data.documentId,
      });

      toast.success("Documento enviado com sucesso!");
      
      // Abrir modal de signatários
      setUploadedDocumentId(data.documentId);
      setIsSignerModalOpen(true);
    } catch (error: any) {
      console.error("Erro ao fazer upload:", error);
      toast.error(error.message || "Erro ao fazer upload do documento");
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
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

      {/* Modal de Signatários */}
      {uploadedDocumentId && (
        <SignerSelectionModal
          open={isSignerModalOpen}
          onOpenChange={(open) => {
            setIsSignerModalOpen(open);
            if (!open && uploadedDocumentId) {
              // Se fechar o modal, redirecionar para a página do documento
              router.push(`/documentos/${uploadedDocumentId}`);
            }
          }}
          documentId={uploadedDocumentId}
          certificates={certificates}
          onComplete={handleSignersComplete}
        />
      )}
    </div>
  );
}

