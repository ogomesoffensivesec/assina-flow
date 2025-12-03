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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Usuário</TableHead>
          <TableHead>Ação</TableHead>
          <TableHead>IP</TableHead>
          <TableHead>Documento</TableHead>
          <TableHead>Detalhes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Nenhum log encontrado
            </TableCell>
          </TableRow>
        ) : (
          logs.map((log) => {
            const Icon = actionIcons[log.action];
            return (
              <TableRow key={log.id}>
                <TableCell>{formatDateTime(log.timestamp)}</TableCell>
                <TableCell>{log.userName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <Badge variant="outline">{actionLabels[log.action]}</Badge>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{log.ip}</TableCell>
                <TableCell>
                  {log.documentName ? (
                    <span className="text-sm">{log.documentName}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {log.details ? (
                    <span className="text-sm text-muted-foreground">{log.details}</span>
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
  );
}

