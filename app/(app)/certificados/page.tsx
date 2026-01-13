"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CertificateTable } from "@/components/certificate-table";
import { EmptyState } from "@/components/empty-state";
import { useCertificateStore } from "@/lib/stores/certificate-store";
import { useAuditStore } from "@/lib/stores/audit-store";
import { useUser } from "@/lib/hooks/use-user";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { CertificateDownloadDialog } from "@/components/certificate-download-dialog";
import { CertificatePasswordDisplay } from "@/components/certificate-password-display";
import { Plus, ShieldCheck, Upload, Search, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function CertificatesPage() {
  const { certificates, isLoading, fetchCertificates, removeCertificate } = useCertificateStore();
  const { addLog } = useAuditStore();
  const { user } = useUser();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState<string | null>(null);
  const [certificateToDownload, setCertificateToDownload] = useState<string | null>(null);
  const [certificateToViewPassword, setCertificateToViewPassword] = useState<string | null>(null);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [validityFilter, setValidityFilter] = useState<string>("all");

  // Função para normalizar texto (remove acentos e converte para minúsculas)
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^\w\s]/g, "") // Remove caracteres especiais, mantém apenas letras, números e espaços
      .trim();
  };

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  // Filtrar certificados
  const filteredCertificates = useMemo(() => {
    let filtered = [...certificates];

    // Filtro de busca por texto (nome ou CPF/CNPJ)
    if (searchQuery.trim()) {
      const query = searchQuery.trim();
      const normalizedQuery = normalizeText(query);
      const numericQuery = query.replace(/\D/g, ""); // Remove caracteres não numéricos para busca de CPF/CNPJ
      
      filtered = filtered.filter((cert) => {
        // Busca por nome (normalizado, sem acentos, case-insensitive)
        const normalizedName = cert.name ? normalizeText(cert.name) : "";
        const nameMatch = normalizedName.includes(normalizedQuery);
        
        // Busca por CPF/CNPJ (normaliza ambos para comparar apenas números)
        let cpfCnpjMatch = false;
        if (cert.cpfCnpj && numericQuery.length > 0) {
          const normalizedCpfCnpj = cert.cpfCnpj.replace(/\D/g, ""); // Remove pontos, traços, barras, etc.
          cpfCnpjMatch = normalizedCpfCnpj.includes(numericQuery);
        }
        
        return nameMatch || cpfCnpjMatch;
      });
    }

    // Filtro por tipo
    if (typeFilter !== "all") {
      filtered = filtered.filter((cert) => cert.type === typeFilter);
    }

    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter((cert) => cert.status === statusFilter);
    }

    // Filtro por validade
    if (validityFilter !== "all") {
      filtered = filtered.filter((cert) => {
        const validTo = new Date(cert.validTo);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        switch (validityFilter) {
          case "valid":
            return daysUntilExpiry > 30;
          case "expiring_soon":
            return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
          case "expired":
            return daysUntilExpiry <= 0;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [certificates, searchQuery, typeFilter, statusFilter, validityFilter]);

  const handleDelete = (id: string) => {
    setCertificateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDownload = (id: string) => {
    setCertificateToDownload(id);
    setDownloadDialogOpen(true);
  };

  const handleViewPassword = (id: string) => {
    setCertificateToViewPassword(id);
    setPasswordDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (certificateToDelete) {
      try {
        const cert = certificates.find((c) => c.id === certificateToDelete);
        await removeCertificate(certificateToDelete);
        
        addLog({
          userId: user?.id || "unknown",
          userName: user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.firstName || user?.email || "Unknown",
          action: "certificate_remove",
          ip: "192.168.1.1",
          details: `Certificado ${cert?.name} removido`,
        });
        toast.success("Certificado removido com sucesso");
        setDeleteDialogOpen(false);
        setCertificateToDelete(null);
      } catch (error: any) {
        console.error("Erro ao excluir certificado:", error);
        toast.error(error.message || "Erro ao excluir certificado");
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificados"
        description="Gerencie seus certificados digitais A1"
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link href="/certificados/em-massa" className="flex items-center justify-center">
                <Upload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Upload em Massa</span>
                <span className="sm:hidden">Em Massa</span>
              </Link>
            </Button>
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/certificados/novo" className="flex items-center justify-center">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Adicionar Certificado A1</span>
                <span className="sm:hidden">Adicionar</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* Filtros de busca */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Campo de busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF/CNPJ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro por tipo */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="PF">Pessoa Física</SelectItem>
              <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por validade */}
          <Select value={validityFilter} onValueChange={setValidityFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Validade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as validades</SelectItem>
              <SelectItem value="valid">Válido</SelectItem>
              <SelectItem value="expiring_soon">Expirando em breve</SelectItem>
              <SelectItem value="expired">Expirado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contador de resultados */}
        {!isLoading && (
          <div className="text-sm text-muted-foreground">
            {filteredCertificates.length === certificates.length ? (
              <span>{certificates.length} certificado{certificates.length !== 1 ? "s" : ""} encontrado{certificates.length !== 1 ? "s" : ""}</span>
            ) : (
              <span>
                Mostrando {filteredCertificates.length} de {certificates.length} certificado{certificates.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando certificados...
        </div>
      ) : certificates.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum certificado cadastrado"
          description="Comece adicionando seu primeiro certificado digital A1"
          actionLabel="Adicionar Certificado"
          onAction={() => {
            window.location.href = "/certificados/novo";
          }}
        />
      ) : filteredCertificates.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum certificado encontrado"
          description="Tente ajustar os filtros de busca"
          actionLabel="Limpar filtros"
          onAction={() => {
            setSearchQuery("");
            setTypeFilter("all");
            setStatusFilter("all");
            setValidityFilter("all");
          }}
        />
      ) : (
        <CertificateTable
          certificates={filteredCertificates}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onViewPassword={handleViewPassword}
        />
      )}

      {certificateToDownload && (
        <CertificateDownloadDialog
          open={downloadDialogOpen}
          onOpenChange={(open) => {
            setDownloadDialogOpen(open);
            if (!open) {
              setCertificateToDownload(null);
            }
          }}
          certificateId={certificateToDownload}
          certificateName={certificates.find((c) => c.id === certificateToDownload)?.name || "Certificado"}
          hasPassword={certificates.find((c) => c.id === certificateToDownload)?.hasPassword || false}
        />
      )}

      {certificateToViewPassword && (
        <CertificatePasswordDisplay
          open={passwordDialogOpen}
          onOpenChange={(open) => {
            setPasswordDialogOpen(open);
            if (!open) {
              setCertificateToViewPassword(null);
            }
          }}
          certificateId={certificateToViewPassword}
          certificateName={certificates.find((c) => c.id === certificateToViewPassword)?.name || "Certificado"}
          hasPassword={certificates.find((c) => c.id === certificateToViewPassword)?.hasPassword || false}
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

