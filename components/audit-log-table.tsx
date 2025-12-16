"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AuditLog } from "@/lib/stores/audit-store";
import { formatDateTime } from "@/lib/utils/date";
import { Upload, FileSignature, Trash2, AlertTriangle, ShieldCheck, UserPlus, UserMinus } from "lucide-react";

interface AuditLogTableProps {
  logs: AuditLog[];
}

const actionIcons = {
  upload: Upload,
  signature: FileSignature,
  delete: Trash2,
  failure: AlertTriangle,
  certificate_add: ShieldCheck,
  certificate_remove: ShieldCheck,
  signer_add: UserPlus,
  signer_remove: UserMinus,
};

const actionLabels: Record<AuditLog["action"], string> = {
  upload: "Upload",
  signature: "Assinatura",
  delete: "Exclusão",
  failure: "Falha",
  certificate_add: "Certificado Adicionado",
  certificate_remove: "Certificado Removido",
  signer_add: "Signatário Adicionado",
  signer_remove: "Signatário Removido",
};

export function AuditLogTable({ logs }: AuditLogTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px] sm:min-w-[160px]">Data/Hora</TableHead>
              <TableHead className="hidden md:table-cell min-w-[150px]">Usuário</TableHead>
              <TableHead className="min-w-[120px] sm:min-w-[140px]">Ação</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[120px]">IP</TableHead>
              <TableHead className="hidden xl:table-cell min-w-[180px]">Documento</TableHead>
              <TableHead className="hidden xl:table-cell min-w-[200px]">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8 px-4">
              Nenhum log encontrado
            </TableCell>
          </TableRow>
        ) : (
          logs.map((log) => {
            const Icon = actionIcons[log.action];
            return (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="text-xs sm:text-sm">{formatDateTime(log.timestamp)}</div>
                    <div className="text-xs text-muted-foreground md:hidden">{log.userName}</div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="max-w-[150px] truncate" title={log.userName}>
                    {log.userName}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {Icon && <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />}
                    <Badge variant="outline" className="whitespace-nowrap text-xs">{actionLabels[log.action]}</Badge>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell font-mono text-xs whitespace-nowrap">{log.ip}</TableCell>
                <TableCell className="hidden xl:table-cell">
                  {log.documentName ? (
                    <div className="max-w-[180px] truncate" title={log.documentName}>
                      <span className="text-sm">{log.documentName}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  {log.details ? (
                    <div className="max-w-[200px] truncate" title={log.details}>
                      <span className="text-sm text-muted-foreground">{log.details}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}

