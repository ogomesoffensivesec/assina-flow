"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuditLogTable } from "@/components/audit-log-table";
import { useAuditStore, AuditAction } from "@/lib/stores/audit-store";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function AuditPage() {
  const { logs, getLogs } = useAuditStore();
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredLogs = getLogs({
    action: actionFilter !== "all" ? actionFilter : undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });

  const handleExportCSV = () => {
    // Mock: Simular exportação CSV
    toast.success("CSV exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        description="Histórico completo de ações realizadas no sistema"
        actions={
          <Button onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="action-filter">Ação:</Label>
          <Select
            value={actionFilter}
            onValueChange={(value) => setActionFilter(value as AuditAction | "all")}
          >
            <SelectTrigger id="action-filter" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
              <SelectItem value="signature">Assinatura</SelectItem>
              <SelectItem value="delete">Exclusão</SelectItem>
              <SelectItem value="failure">Falha</SelectItem>
              <SelectItem value="certificate_add">Certificado Adicionado</SelectItem>
              <SelectItem value="certificate_remove">Certificado Removido</SelectItem>
              <SelectItem value="signer_add">Signatário Adicionado</SelectItem>
              <SelectItem value="signer_remove">Signatário Removido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="start-date">Data Inicial:</Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[150px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="end-date">Data Final:</Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[150px]"
          />
        </div>
      </div>

      <AuditLogTable logs={filteredLogs} />
    </div>
  );
}

