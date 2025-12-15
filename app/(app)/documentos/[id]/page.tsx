"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignerList } from "@/components/signer-list";
import { AuditLogTable } from "@/components/audit-log-table";
import { SignerSelectionModal } from "@/components/signer-selection-modal";
import { useDocumentStore, Document } from "@/lib/stores/document-store";
import { useAuditStore } from "@/lib/stores/audit-store";
import { useUser } from "@/lib/hooks/use-user";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatFileSize } from "@/lib/utils/date";
import { FileSignature, Download, Users } from "lucide-react";
import { toast } from "sonner";

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { documents, fetchDocument } = useDocumentStore();
  const { getLogs } = useAuditStore();
  const { user } = useUser();
  const [signerModalOpen, setSignerModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [localDocument, setLocalDocument] = useState<Document | null>(null);

  // Carregar documento ao montar e quando documents mudar
  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);
      try {
        const doc = await fetchDocument(resolvedParams.id);
        if (doc) {
          setLocalDocument(doc);
        }
      } catch (error) {
        console.error("Erro ao carregar documento:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDocument();
  }, [resolvedParams.id, fetchDocument]);

  // Atualizar documento local quando o store mudar
  useEffect(() => {
    const doc = documents.find((d) => d.id === resolvedParams.id);
    if (doc) {
      setLocalDocument(doc);
    }
  }, [documents, resolvedParams.id]);

  const document = localDocument;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        {/* Fluxo de Assinatura Skeleton */}
        <div className="flex justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto mt-2" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-10 w-48" />
                <div className="w-full mt-4 pt-4 border-t space-y-2">
                  <Skeleton className="h-4 w-40 mx-auto" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Skeleton */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="space-y-6">
        <PageHeader title="Documento não encontrado" />
        <p className="text-muted-foreground">
          O documento solicitado não foi encontrado.
        </p>
      </div>
    );
  }

  const documentLogs = getLogs({
    documentId: document.id,
  });

  const signers = document.signers || [];

  const handlePrepareAndSend = async () => {
    if (!document) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/documentos/${document.id}/preparar-enviar`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao preparar e enviar documento");
      }

      const result = await response.json();
      toast.success(result.message || "Documento preparado e notificação enviada para os signatários");
      
      // Recarregar documento para atualizar status
      await fetchDocument(document.id);
    } catch (error: any) {
      console.error("Erro ao preparar e enviar documento:", error);
      toast.error(error.message || "Erro ao preparar e enviar documento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignComplete = async (reason: string, location: string) => {
    try {
      const updatedDoc = await fetchDocument(document.id);
      if (updatedDoc) {
        setLocalDocument(updatedDoc);
      }
      toast.success("Documento assinado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao atualizar documento:", error);
      toast.error(error.message || "Erro ao atualizar documento");
    }
  };

  const handleSignersComplete = async (signers: any[]) => {
    console.log("[DEBUG DetailPage] handleSignersComplete chamado:", {
      documentId: document.id,
      signersCount: signers.length,
    });

    try {
      // Aguardar um pouco antes de buscar para garantir que o banco foi atualizado
      console.log("[DEBUG DetailPage] Aguardando atualização do banco...");
      await new Promise((resolve) => setTimeout(resolve, 1200));
      
      // Buscar documento atualizado
      console.log("[DEBUG DetailPage] Buscando documento atualizado...");
      setIsLoading(true);
      const updatedDoc = await fetchDocument(document.id);
      
      console.log("[DEBUG DetailPage] Documento atualizado recebido:", {
        found: !!updatedDoc,
        signersCount: updatedDoc?.signers?.length || 0,
        status: updatedDoc?.status,
      });
      
      if (updatedDoc) {
        setLocalDocument(updatedDoc);
        const actualSignersCount = updatedDoc.signers?.length || 0;
        
        if (actualSignersCount > 0) {
          console.log("[DEBUG DetailPage] Signatários confirmados:", actualSignersCount);
          toast.success(`${actualSignersCount} signatário(s) configurado(s) com sucesso!`);
        } else {
          console.warn("[DEBUG DetailPage] Nenhum signatário encontrado após atualização");
          toast.warning("Signatários podem não ter sido salvos. Recarregue a página.");
        }
      } else {
        console.error("[DEBUG DetailPage] Documento não encontrado após atualização");
        toast.error("Erro ao atualizar documento");
      }
    } catch (error: any) {
      console.error("[DEBUG DetailPage] Erro ao atualizar documento:", {
        message: error.message,
        error,
      });
      toast.error(error.message || "Erro ao atualizar documento");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (signed: boolean = false) => {
    if (!signed) {
      toast.error("Download do documento original ainda não implementado");
      return;
    }

    try {
      const response = await fetch(`/api/documentos/${document.id}/download`);
      
      if (!response.ok) {
        // Tentar ler mensagem de erro do JSON
        let errorMessage = "Erro ao baixar documento";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Se não conseguir ler JSON, usar mensagem padrão
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.fileName.replace('.pdf', '')}_assinado.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      toast.success("Download do documento assinado iniciado");
    } catch (error: any) {
      console.error("Erro ao baixar documento:", error);
      toast.error(error.message || "Erro ao baixar documento");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={document.name}
        description="Visualize e gerencie o documento"
        breadcrumbs={[
          { label: "Documentos", href: "/documentos" },
          { label: document.name },
        ]}
      />

      {/* Seção Centralizada do Fluxo de Assinatura */}
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-center">Fluxo de Assinatura</CardTitle>
            <CardDescription className="text-center">
              Configure signatários e assine o documento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              {/* Status do Documento */}
              <div className="flex items-center gap-2">
                <DocumentStatusBadge status={document.status} />
                <span className="text-sm text-muted-foreground">
                  {signers.length} signatário(s) configurado(s)
                </span>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-3 flex-wrap justify-center">
                {/* Botão para configurar signatários se não houver ou status for pending */}
                {(document.status === "pending" || signers.length === 0) && (
                  <Button 
                    onClick={() => setSignerModalOpen(true)} 
                    variant="outline"
                    size="lg"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Configurar Signatários
                  </Button>
                )}
                {/* Botão para preparar e enviar se houver signatários e status for waiting_signers */}
                {document.status === "waiting_signers" && signers.length > 0 && (
                  <Button 
                    onClick={handlePrepareAndSend} 
                    disabled={isLoading}
                    size="lg"
                  >
                    <FileSignature className="mr-2 h-4 w-4" />
                    {isLoading ? "Preparando..." : "Preparar e Enviar para Assinatura"}
                  </Button>
                )}
                {/* Botão para baixar se assinado */}
                {(document.status === "signed" || document.status === "completed") && (
                  <Button 
                    onClick={() => handleDownload(true)}
                    size="lg"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Assinado
                  </Button>
                )}
              </div>

              {/* Informações Adicionais */}
              {signers.length > 0 && (
                <div className="w-full mt-4 pt-4 border-t">
                  <p className="text-sm font-semibold mb-2 text-center">Signatários Configurados:</p>
                  <div className="space-y-2">
                    {signers.map((signer) => {
                      return (
                        <div 
                          key={signer.id} 
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">#{signer.order}</span>
                            <span className="text-sm font-medium">{signer.name}</span>
                          </div>
                          {signer.identification && (
                            <span className="text-xs text-muted-foreground">
                              {signer.identification}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar com Tabs */}
      <div className="max-w-4xl mx-auto">
        <div className="space-y-4">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="summary">Resumo</TabsTrigger>
              <TabsTrigger value="signers">Signatários</TabsTrigger>
              <TabsTrigger value="audit">Auditoria</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Documento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="text-sm font-medium">{document.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">
                      <DocumentStatusBadge status={document.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Hash (SHA256)</p>
                    <p className="text-xs font-mono break-all">
                      {document.hash || "N/A"}
                    </p>
                  </div>
                  {document.signedHash && (
                    <div>
                      <p className="text-xs text-muted-foreground">Hash Assinado</p>
                      <p className="text-xs font-mono break-all">
                        {document.signedHash}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signers">
              <Card>
                <CardHeader>
                  <CardTitle>Signatários</CardTitle>
                  <CardDescription>
                    Lista de pessoas que devem assinar este documento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SignerList signers={signers} showActions={false} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle>Auditoria</CardTitle>
                  <CardDescription>
                    Histórico de ações realizadas neste documento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AuditLogTable logs={documentLogs} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {document.status === "signed" && (
        <Card>
          <CardHeader>
            <CardTitle>Documento Assinado Digitalmente</CardTitle>
            <CardDescription>
              Este documento foi assinado com certificado digital A1
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {signers
                  .filter((s) => s.status === "signed")
                  .map((signer) => {
                    return (
                      <div key={signer.id} className="space-y-2">
                        <p className="text-sm font-medium">{signer.name}</p>
                        {signer.phoneNumber && (
                          <p className="text-xs text-muted-foreground">
                            WhatsApp: {signer.phoneNumber}
                          </p>
                        )}
                        {signer.identification && (
                          <p className="text-xs text-muted-foreground">
                            Identificação: {signer.identification}
                          </p>
                        )}
                        {signer.signedAt && (
                          <p className="text-xs text-muted-foreground">
                            Assinado em: {formatDate(new Date(signer.signedAt))}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
              {/* TODO: Implementar QR Code real com URL de validação */}
              <div className="flex items-center justify-center p-4 border border-border rounded-lg bg-muted/50">
                <div className="text-center">
                  <div className="w-32 h-32 bg-muted border border-border rounded mx-auto mb-2 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">QR Code</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    URL de Validação (em desenvolvimento)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      <SignerSelectionModal
        open={signerModalOpen}
        onOpenChange={setSignerModalOpen}
        documentId={document.id}
        certificates={[]}
        onComplete={handleSignersComplete}
      />
    </div>
  );
}
