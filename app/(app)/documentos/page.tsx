"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DocumentTable } from "@/components/document-table";
import { EmptyState } from "@/components/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDocumentStore } from "@/lib/stores/document-store";
import { useAuditStore } from "@/lib/stores/audit-store";
import { useUser } from "@/lib/hooks/use-user";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { DocumentStatus } from "@/lib/stores/document-store";
import { Plus, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function DocumentsPage() {
  const router = useRouter();
  const { documents, removeDocument } = useDocumentStore();
  const { addLog } = useAuditStore();
  const { user } = useUser();
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const filteredDocuments =
    statusFilter === "all"
      ? documents
      : documents.filter((d) => d.status === statusFilter);

  const handleDelete = (id: string) => {
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      const doc = documents.find((d) => d.id === documentToDelete);
      removeDocument(documentToDelete);
      addLog({
        userId: user?.id || "unknown",
        userName: user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.firstName || user?.email || "Unknown",
        action: "delete",
        ip: "192.168.1.1",
        documentId: documentToDelete,
        documentName: doc?.name,
      });
      toast.success("Documento excluído com sucesso");
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleConfigure = (id: string) => {
    router.push(`/documentos/${id}/signatarios`);
  };

  const handleSign = (id: string) => {
    router.push(`/documentos/${id}`);
  };

  const handleDownload = (id: string) => {
    // Mock: Simular download
    toast.success("Download iniciado");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos"
        description="Gerencie seus documentos e assinaturas digitais"
        actions={
          <Button asChild>
            <Link href="/documentos/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Documento
            </Link>
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="status-filter">Status:</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as DocumentStatus | "all")
            }
          >
            <SelectTrigger id="status-filter" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending_config">Aguardando configuração</SelectItem>
              <SelectItem value="pending_signature">Aguardando assinatura</SelectItem>
              <SelectItem value="signed">Assinado</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum documento encontrado"
          description={
            statusFilter === "all"
              ? "Comece fazendo upload do seu primeiro documento"
              : "Nenhum documento com este status"
          }
          actionLabel="Novo Documento"
          onAction={() => {
            window.location.href = "/documentos/novo";
          }}
        />
      ) : (
        <DocumentTable
          documents={filteredDocuments}
          onConfigure={handleConfigure}
          onSign={handleSign}
          onDelete={handleDelete}
          onDownload={handleDownload}
        />
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Documento"
        description="Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

