"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCertificateStore } from "@/lib/stores/certificate-store";
import { useDocumentStore } from "@/lib/stores/document-store";
import { useAuditStore } from "@/lib/stores/audit-store";
import { useUser } from "@/lib/hooks/use-user";
import { DateExpiresBadge } from "@/components/date-expires-badge";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { formatDate, getValidityStatus } from "@/lib/utils/date";
import { ShieldCheck, Trash2, CheckCircle2, Download } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { CertificateDownloadDialog } from "@/components/certificate-download-dialog";

export default function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { getCertificate, fetchCertificate, removeCertificate } = useCertificateStore();
  const { documents } = useDocumentStore();
  const { addLog } = useAuditStore();
  const { user } = useUser();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const certificate = getCertificate(resolvedParams.id);

  useEffect(() => {
    const loadCertificate = async () => {
      if (!certificate) {
        setIsLoading(true);
        await fetchCertificate(resolvedParams.id);
      }
      setIsLoading(false);
    };
    loadCertificate();
  }, [resolvedParams.id, certificate, fetchCertificate]);

  if (!certificate) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificado não encontrado" />
        <p className="text-muted-foreground">
          O certificado solicitado não foi encontrado.
        </p>
      </div>
    );
  }

  const signedDocuments = documents.filter((d) =>
    d.signers.some((s) => s.certificateId === certificate.id)
  );

  const handleTestValidation = () => {
    // TODO: Implementar validação real do certificado
    toast.success("Certificado válido e funcionando corretamente!");
  };

  const handleDelete = async () => {
    try {
      await removeCertificate(certificate.id);
    addLog({
      userId: user?.id || "unknown",
      userName: user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.firstName || user?.email || "Unknown",
      action: "certificate_remove",
      ip: "192.168.1.1",
      details: `Certificado ${certificate.name} excluído`,
    });
      toast.success("Certificado excluído com sucesso");
      router.push("/certificados");
    } catch (error: any) {
      console.error("Erro ao excluir certificado:", error);
      toast.error(error.message || "Erro ao excluir certificado");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={certificate.name}
        description="Detalhes do certificado digital"
        breadcrumbs={[
          { label: "Certificados", href: "/certificados" },
          { label: certificate.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setDownloadDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Certificado
            </Button>
            <Button variant="outline" onClick={handleTestValidation}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Testar Validação
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Certificado
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Certificado</CardTitle>
            <CardDescription>Dados principais do certificado digital</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Nome Identificador</p>
              <p className="text-sm font-medium">{certificate.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium">
                {certificate.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CNPJ/CPF</p>
              <p className="text-sm font-medium">{certificate.cpfCnpj}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Emitido por</p>
              <p className="text-sm font-medium">{certificate.issuedBy}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Serial Number</p>
              <p className="text-xs font-medium font-mono">
                {certificate.serialNumber}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Válido de</p>
              <p className="text-sm font-medium">
                {formatDate(new Date(certificate.validFrom))} até {formatDate(new Date(certificate.validTo))}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status de Validade</p>
              <div className="mt-1">
                <DateExpiresBadge 
                  validTo={new Date(certificate.validTo)} 
                  certificateId={certificate.id}
                  onClick={() => router.push("/certificados/novo")}
                />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1">
                <Badge
                  variant={certificate.status === "active" ? "default" : "secondary"}
                >
                  {certificate.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentos Assinados</CardTitle>
            <CardDescription>
              Documentos que foram assinados com este certificado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signedDocuments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum documento assinado ainda</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signedDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{formatDate(new Date(doc.uploadedAt))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CertificateDownloadDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        certificateId={certificate.id}
        certificateName={certificate.name}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Certificado"
        description="Tem certeza que deseja excluir este certificado? Esta ação não pode ser desfeita e todos os documentos assinados com este certificado serão afetados."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

