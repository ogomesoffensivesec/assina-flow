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
    if (filteredLogs.length === 0) {
      toast.error("Não há logs para exportar");
      return;
    }

    // Criar cabeçalho CSV
    const headers = ["Data/Hora", "Usuário", "Ação", "IP", "Documento", "Detalhes"];
    
    // Criar linhas CSV
    const rows = filteredLogs.map((log) => [
      new Date(log.timestamp).toLocaleString("pt-BR"),
      log.userName,
      log.action,
      log.ip,
      log.documentName || "-",
      log.details || "-",
    ]);

    // Combinar cabeçalho e linhas
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Criar blob e fazer download
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

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
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
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

