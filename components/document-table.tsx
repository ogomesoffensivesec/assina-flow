"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Document, DocumentStatus } from "@/lib/stores/document-store";
import { DocumentStatusBadge } from "@/components/document-status-badge";
import { formatDate, formatFileSize } from "@/lib/utils/date";
import { Eye, Settings, FileSignature, Trash2, Download } from "lucide-react";
import Link from "next/link";

interface DocumentTableProps {
  documents: Document[];
  onView?: (id: string) => void;
  onConfigure?: (id: string) => void;
  onSign?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
}

export function DocumentTable({
  documents,
  onView,
  onConfigure,
  onSign,
  onDelete,
  onDownload,
}: DocumentTableProps) {
  const getActionButtons = (document: Document) => {
    const buttons = [];

    if (onView) {
      buttons.push(
        <Button
          key="view"
          variant="ghost"
          size="icon"
          asChild
        >
          <Link href={`/documentos/${document.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      );
    }

    if (document.status === "pending_config" && onConfigure) {
      buttons.push(
        <Button
          key="configure"
          variant="ghost"
          size="icon"
          onClick={() => onConfigure(document.id)}
          title="Configurar signatários"
        >
          <Settings className="h-4 w-4" />
        </Button>
      );
    }

    if (document.status === "pending_signature" && onSign) {
      buttons.push(
        <Button
          key="sign"
          variant="ghost"
          size="icon"
          onClick={() => onSign(document.id)}
          title="Assinar documento"
        >
          <FileSignature className="h-4 w-4" />
        </Button>
      );
    }

    if (document.status === "signed" && onDownload) {
      buttons.push(
        <Button
          key="download"
          variant="ghost"
          size="icon"
          onClick={() => onDownload(document.id)}
          title="Baixar documento assinado"
        >
          <Download className="h-4 w-4" />
        </Button>
      );
    }

    if (onDelete) {
      buttons.push(
        <Button
          key="delete"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(document.id)}
          className="text-destructive hover:text-destructive"
          title="Excluir documento"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome do Documento</TableHead>
          <TableHead>Páginas</TableHead>
          <TableHead>Signatários</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data de Upload</TableHead>
          <TableHead className="text-right">Ações</TableHead>
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
          documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell className="font-medium">{document.name}</TableCell>
              <TableCell>{document.pageCount}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">{document.signers.length} signatário(s)</div>
                  {document.signers.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {document.signers.slice(0, 2).map((s) => s.name).join(", ")}
                      {document.signers.length > 2 && "..."}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DocumentStatusBadge status={document.status} />
              </TableCell>
              <TableCell>{formatDate(document.uploadedAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {getActionButtons(document)}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

