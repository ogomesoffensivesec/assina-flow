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
import { FileText, Clock, CheckCircle2 } from "lucide-react";
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
    (d) => d.status === "pending" || d.status === "waiting_signers"
  );
  const signedDocuments = documents.filter((d) => d.status === "signed" || d.status === "completed");
  const signingDocuments = documents.filter((d) => d.status === "signing");

  const statusCounts = {
    pending: documents.filter((d) => d.status === "pending").length,
    waiting_signers: documents.filter((d) => d.status === "waiting_signers").length,
    signing: documents.filter((d) => d.status === "signing").length,
    signed: signedDocuments.length,
    completed: documents.filter((d) => d.status === "completed").length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[80vw] w-[80vw] h-[90vh] flex flex-col p-0" style={{ maxWidth: '80vw', width: '80vw' }}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Detalhes dos Documentos
          </DialogTitle>
          <DialogDescription>
            Visão completa de todos os documentos do sistema
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Resumo por Status */}
          <div className="grid grid-cols-5 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <div className="text-sm text-muted-foreground">Pendente</div>
              </div>
              <div className="text-2xl font-bold">{statusCounts.pending}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <div className="text-sm text-muted-foreground">Aguardando Signatários</div>
              </div>
              <div className="text-2xl font-bold">{statusCounts.waiting_signers}</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <div className="text-sm text-muted-foreground">Assinando</div>
              </div>
              <div className="text-2xl font-bold">{statusCounts.signing}</div>
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
                <CheckCircle2 className="h-4 w-4 text-green-700 dark:text-green-300" />
                <div className="text-sm text-muted-foreground">Concluídos</div>
              </div>
              <div className="text-2xl font-bold">{statusCounts.completed}</div>
            </div>
          </div>

          {/* Tabela de Documentos */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Lista Completa</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="min-w-[250px]">Nome do Documento</TableHead>
                      <TableHead className="min-w-[80px]">Páginas</TableHead>
                      <TableHead className="min-w-[150px]">Signatários</TableHead>
                      <TableHead className="min-w-[140px]">Status</TableHead>
                      <TableHead className="min-w-[140px]">Data de Upload</TableHead>
                      <TableHead className="min-w-[100px]">Ações</TableHead>
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
                      <TableCell>{formatDate(new Date(doc.uploadedAt))}</TableCell>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

