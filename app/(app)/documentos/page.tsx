"use client";

import { useState, useEffect } from "react";
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
  const { documents, isLoading, fetchDocuments, removeDocument } = useDocumentStore();
  const { addLog } = useAuditStore();
  const { user } = useUser();
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  // Carregar documentos ao montar o componente
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const filteredDocuments =
    statusFilter === "all"
      ? documents
      : documents.filter((d) => d.status === statusFilter);

  const handleDelete = (id: string) => {
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteMultiple = async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      const response = await fetch("/api/documentos/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds: ids }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir documentos");
      }

      const result = await response.json();
      
      // Adicionar logs de auditoria
      for (const docId of ids) {
        const doc = documents.find((d) => d.id === docId);
        addLog({
          userId: user?.id || "unknown",
          userName: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.firstName || user?.email || "Unknown",
          action: "delete",
          ip: "192.168.1.1",
          documentId: docId,
          documentName: doc?.name,
        });
      }

      // Recarregar documentos
      await fetchDocuments();
      
      toast.success(result.message || `${ids.length} documento(s) excluído(s) com sucesso`);
    } catch (error: any) {
      console.error("Erro ao excluir documentos:", error);
      toast.error(error.message || "Erro ao excluir documentos");
    }
  };

  const confirmDelete = async () => {
    if (documentToDelete) {
      try {
        const doc = documents.find((d) => d.id === documentToDelete);
        await removeDocument(documentToDelete);
        
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
      } catch (error: any) {
        console.error("Erro ao excluir documento:", error);
        toast.error(error.message || "Erro ao excluir documento");
      }
    }
  };

  const handleConfigure = (id: string) => {
    router.push(`/documentos/${id}/signatarios`);
  };

  const handleSign = (id: string) => {
    router.push(`/documentos/${id}`);
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await fetch(`/api/documentos/${id}/download`);
      
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
      const a = document.createElement("a");
      a.href = url;
      const doc = documents.find((d) => d.id === id);
      const fileName = doc?.fileName 
        ? `${doc.fileName.replace('.pdf', '')}_assinado.pdf`
        : `documento_assinado.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success("Download iniciado");
    } catch (error: any) {
      console.error("Erro ao baixar documento:", error);
      toast.error(error.message || "Erro ao baixar documento");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos"
        description="Gerencie seus documentos e assinaturas digitais"
        actions={
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href="/documentos/novo" className="flex items-center justify-center">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Novo Documento</span>
              <span className="sm:hidden">Novo</span>
            </Link>
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Label htmlFor="status-filter" className="text-sm">Status:</Label>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as DocumentStatus | "all")
            }
          >
            <SelectTrigger id="status-filter" className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="waiting_signers">Aguardando signatários</SelectItem>
              <SelectItem value="signing">Assinando</SelectItem>
              <SelectItem value="signed">Assinado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando documentos...
        </div>
      ) : filteredDocuments.length === 0 ? (
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
          onDeleteMultiple={handleDeleteMultiple}
          onDownload={handleDownload}
          showSelection={true}
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

