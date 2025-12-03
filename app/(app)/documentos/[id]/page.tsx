"use client";

import { use } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PDFViewer } from "@/components/pdf-viewer";
import { SignerList } from "@/components/signer-list";
import { AuditLogTable } from "@/components/audit-log-table";
import { SignDocumentModal } from "@/components/sign-document-modal";
import { useDocumentStore } from "@/lib/stores/document-store";
import { useCertificateStore } from "@/lib/stores/certificate-store";
import { useAuditStore } from "@/lib/stores/audit-store";
import { useUser } from "@/lib/hooks/use-user";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { formatDate, formatFileSize } from "@/lib/utils/date";
import { FileSignature, Download, Mail, Settings } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { getDocument, updateDocument } = useDocumentStore();
  const { certificates } = useCertificateStore();
  const { logs, getLogs } = useAuditStore();
  const { user } = useUser();
  const [signModalOpen, setSignModalOpen] = useState(false);

  const document = getDocument(resolvedParams.id);

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

  const availableCertificates = certificates.filter((c) => c.status === "active");

  const handleSign = () => {
    if (availableCertificates.length === 0) {
      toast.error("Nenhum certificado disponível. Cadastre um certificado primeiro.");
      return;
    }
    setSignModalOpen(true);
  };

  const handleSignComplete = (certificateId: string, reason: string, location: string) => {
    // Mock: Simular assinatura
    const signer = document.signers.find((s) => s.status === "pending");
    if (signer) {
      updateDocument(document.id, {
        signers: document.signers.map((s) =>
          s.id === signer.id
            ? {
                ...s,
                status: "signed" as const,
                signedAt: new Date(),
                certificateId,
              }
            : s
        ),
      });

      // Verificar se todos assinaram
      const allSigned = document.signers.every(
        (s) => s.id === signer.id || s.status === "signed"
      );

      if (allSigned) {
        updateDocument(document.id, {
          status: "signed",
          signedAt: new Date(),
          signedHash: `signed_${document.hash}`, // Mock
        });
      }

      toast.success("Documento assinado com sucesso!");
    }
  };

  const handleDownload = (signed: boolean = false) => {
    // Mock: Simular download
    toast.success(
      signed
        ? "Download do documento assinado iniciado"
        : "Download do documento original iniciado"
    );
  };

  const handleSendEmail = () => {
    // Mock: Simular envio por email
    toast.success("Documento enviado por email com sucesso!");
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
        actions={
          <div className="flex items-center gap-2">
            {document.status === "pending_config" && (
              <Button variant="outline" asChild>
                <Link href={`/documentos/${document.id}/signatarios`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurar Signatários
                </Link>
              </Button>
            )}
            {document.status === "pending_signature" && (
              <Button onClick={handleSign}>
                <FileSignature className="mr-2 h-4 w-4" />
                Assinar com Certificado A1
              </Button>
            )}
            {document.status === "signed" && (
              <>
                <Button variant="outline" onClick={() => handleDownload(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar Assinado
                </Button>
                <Button variant="outline" onClick={handleSendEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  Enviar por Email
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => handleDownload(false)}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Original
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Visualizador de PDF */}
        <div className="lg:col-span-2">
          <PDFViewer
            documentUrl={`/api/documents/${document.id}`}
            documentName={document.name}
            className="h-[800px]"
          />
        </div>

        {/* Sidebar com Tabs */}
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
                    <p className="text-xs text-muted-foreground">Certificados Disponíveis</p>
                    <div className="mt-1 space-y-1">
                      {availableCertificates.length > 0 ? (
                        availableCertificates.map((cert) => (
                          <p key={cert.id} className="text-sm">
                            {cert.name}
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhum certificado disponível
                        </p>
                      )}
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
                  <SignerList signers={document.signers} showActions={false} />
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
                {document.signers
                  .filter((s) => s.status === "signed")
                  .map((signer) => {
                    const cert = certificates.find((c) => c.id === signer.certificateId);
                    return (
                      <div key={signer.id} className="space-y-2">
                        <p className="text-sm font-medium">{signer.name}</p>
                        {cert && (
                          <>
                            <p className="text-xs text-muted-foreground">
                              Certificado: {cert.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cert.cpfCnpj} - Válido até {formatDate(cert.validTo)}
                            </p>
                          </>
                        )}
                        {signer.signedAt && (
                          <p className="text-xs text-muted-foreground">
                            Assinado em: {formatDate(signer.signedAt)}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
              {/* Mock QR Code */}
              <div className="flex items-center justify-center p-4 border border-border rounded-lg bg-muted/50">
                <div className="text-center">
                  <div className="w-32 h-32 bg-muted border border-border rounded mx-auto mb-2 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">QR Code</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    URL de Validação
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <SignDocumentModal
        open={signModalOpen}
        onOpenChange={setSignModalOpen}
        document={document}
        certificates={availableCertificates}
        onSign={handleSignComplete}
      />
    </div>
  );
}

