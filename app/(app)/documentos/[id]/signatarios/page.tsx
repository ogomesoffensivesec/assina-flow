"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignerList } from "@/components/signer-list";
import { SignerModal } from "@/components/signer-modal";
import { useDocumentStore, Signer } from "@/lib/stores/document-store";
import { useAuditStore } from "@/lib/stores/audit-store";
import { useUser } from "@/lib/hooks/use-user";
import { formatFileSize } from "@/lib/utils/date";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { Plus, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function DocumentSignersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { getDocument, updateDocument, addSigner, removeSigner, updateSigner } =
    useDocumentStore();
  const { addLog } = useAuditStore();
  const { user } = useUser();
  const [signerModalOpen, setSignerModalOpen] = useState(false);
  const [editingSigner, setEditingSigner] = useState<Signer | undefined>();

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

  const handleAddSigner = () => {
    setEditingSigner(undefined);
    setSignerModalOpen(true);
  };

  const handleEditSigner = (signer: Signer) => {
    setEditingSigner(signer);
    setSignerModalOpen(true);
  };

  const handleSaveSigner = (data: {
    name: string;
    email: string;
    signatureType: "digital_a1" | "electronic";
    order: number;
  }) => {
    if (editingSigner) {
      updateSigner(document.id, editingSigner.id, data);
      toast.success("Signatário atualizado com sucesso");
    } else {
      addSigner(document.id, {
        ...data,
        status: "pending",
      });
      addLog({
        userId: user?.id || "unknown",
        userName: user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.firstName || user?.email || "Unknown",
        action: "signer_add",
        ip: "192.168.1.1",
        documentId: document.id,
        documentName: document.name,
      });
      toast.success("Signatário adicionado com sucesso");
    }
    setSignerModalOpen(false);
  };

  const handleDeleteSigner = (signerId: string) => {
    removeSigner(document.id, signerId);
    addLog({
      userId: user?.id || "unknown",
      userName: user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.firstName || user?.email || "Unknown",
      action: "signer_remove",
      ip: "192.168.1.1",
      documentId: document.id,
      documentName: document.name,
    });
    toast.success("Signatário removido com sucesso");
  };

  const handleSaveChanges = () => {
    if (document.signers.length === 0) {
      toast.error("Adicione pelo menos um signatário");
      return;
    }

    updateDocument(document.id, {
      status: "pending_signature",
    });
    toast.success("Alterações salvas com sucesso");
  };

  const handleProceedToSign = () => {
    if (document.signers.length === 0) {
      toast.error("Adicione pelo menos um signatário");
      return;
    }

    updateDocument(document.id, {
      status: "pending_signature",
    });
    router.push(`/documentos/${document.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurar Signatários"
        description="Defina quem irá assinar este documento"
        breadcrumbs={[
          { label: "Documentos", href: "/documentos" },
          { label: document.name, href: `/documentos/${document.id}` },
          { label: "Signatários" },
        ]}
        actions={
          <Button onClick={handleAddSigner}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Signatário
          </Button>
        }
      />

      {/* Resumo do Documento */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Nome</p>
              <p className="text-sm font-medium">{document.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tamanho</p>
              <p className="text-sm font-medium">{formatFileSize(document.fileSize)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <div className="mt-1">
                <DocumentStatusBadge status={document.status} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Signatários */}
      <Card>
        <CardHeader>
          <CardTitle>Signatários</CardTitle>
          <CardDescription>
            Configure a ordem e os dados de cada signatário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignerList
            signers={document.signers}
            onEdit={handleEditSigner}
            onDelete={handleDeleteSigner}
          />
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSaveChanges}>
            Salvar Alterações
          </Button>
          <Button onClick={handleProceedToSign}>
            Prosseguir para Assinatura
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      <SignerModal
        open={signerModalOpen}
        onOpenChange={setSignerModalOpen}
        signer={editingSigner}
        maxOrder={document.signers.length}
        onSave={handleSaveSigner}
      />
    </div>
  );
}

