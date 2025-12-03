"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CertificateTable } from "@/components/certificate-table";
import { EmptyState } from "@/components/empty-state";
import { useCertificateStore } from "@/lib/stores/certificate-store";
import { useAuditStore } from "@/lib/stores/audit-store";
import { useUser } from "@/lib/hooks/use-user";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function CertificatesPage() {
  const { certificates, removeCertificate } = useCertificateStore();
  const { addLog } = useAuditStore();
  const { user } = useUser();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setCertificateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (certificateToDelete) {
      const cert = certificates.find((c) => c.id === certificateToDelete);
      removeCertificate(certificateToDelete);
      addLog({
        userId: user?.id || "unknown",
        userName: user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.firstName || user?.email || "Unknown",
        action: "certificate_remove",
        ip: "192.168.1.1", // Mock
        details: `Certificado ${cert?.name} removido`,
      });
      toast.success("Certificado removido com sucesso");
      setDeleteDialogOpen(false);
      setCertificateToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificados"
        description="Gerencie seus certificados digitais A1"
        actions={
          <Button asChild>
            <Link href="/certificados/novo">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Certificado A1
            </Link>
          </Button>
        }
      />

      {certificates.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum certificado cadastrado"
          description="Comece adicionando seu primeiro certificado digital A1"
          actionLabel="Adicionar Certificado"
          onAction={() => {
            window.location.href = "/certificados/novo";
          }}
        />
      ) : (
        <CertificateTable
          certificates={certificates}
          onDelete={handleDelete}
        />
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Certificado"
        description="Tem certeza que deseja excluir este certificado? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

