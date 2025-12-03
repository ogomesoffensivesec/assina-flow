"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { Document } from "@/lib/stores/document-store";
import { formatDate } from "@/lib/utils/date";
import { FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: Document[];
}

export function DocumentsDialog({
  open,
  onOpenChange,
  documents,
}: DocumentsDialogProps) {
  const pendingDocuments = documents.filter(
    (d) => d.status === "pending_config" || d.status === "pending_signature"
  );
  const signedDocuments = documents.filter((d) => d.status === "signed");
  const errorDocuments = documents.filter((d) => d.status === "error");

  const statusCounts = {
    pending_config: documents.filter((d) => d.status === "pending_config").length,
    pending_signature: documents.filter((d) => d.status === "pending_signature").length,
    signed: signedDocuments.length,
    error: errorDocuments.length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Detalhes dos Documentos
          </DialogTitle>
          <DialogDescription>
            Visão completa de todos os documentos do sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo por Status */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <div className="text-sm text-muted-foreground">Aguardando Config</div>
              </div>
              <div className="text-2xl font-bold">{statusCounts.pending_config}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div className="text-sm text-muted-foreground">Aguardando Assinatura</div>
              </div>
              <div className="text-2xl font-bold">{statusCounts.pending_signature}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <div className="text-sm text-muted-foreground">Assinados</div>
              </div>
              <div className="text-2xl font-bold">{statusCounts.signed}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <div className="text-sm text-muted-foreground">Erro</div>
              </div>
              <div className="text-2xl font-bold">{statusCounts.error}</div>
            </div>
          </div>

          {/* Tabela de Documentos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Lista Completa</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Documento</TableHead>
                  <TableHead>Páginas</TableHead>
                  <TableHead>Signatários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Upload</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum documento cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{doc.pageCount}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {doc.signers.length} signatário(s)
                        </div>
                      </TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={doc.status} />
                      </TableCell>
                      <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/documentos/${doc.id}`}>Ver</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

