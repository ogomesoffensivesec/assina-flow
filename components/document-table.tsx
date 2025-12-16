"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  onDeleteMultiple?: (ids: string[]) => void;
  onDownload?: (id: string) => void;
  showSelection?: boolean;
}

export function DocumentTable({
  documents,
  onView,
  onConfigure,
  onSign,
  onDelete,
  onDeleteMultiple,
  onDownload,
  showSelection = true,
}: DocumentTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = () => {
    if (onDeleteMultiple && selectedIds.size > 0) {
      onDeleteMultiple(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const allSelected = documents.length > 0 && selectedIds.size === documents.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < documents.length;
  const getActionButtons = (document: Document) => {
    const buttons = [];

    if (onView) {
      buttons.push(
        <Button
          key="view"
          variant="outline"
          size="sm"
          asChild
          className="h-7 sm:h-8 text-xs px-2 sm:px-3"
        >
          <Link href={`/documentos/${document.id}`} className="flex items-center gap-1 sm:gap-1.5">
            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Ver</span>
          </Link>
        </Button>
      );
    }

    if ((document.status === "pending" || document.status === "waiting_signers") && onConfigure) {
      buttons.push(
        <Button
          key="configure"
          variant="outline"
          size="sm"
          onClick={() => onConfigure(document.id)}
          className="h-7 sm:h-8 text-xs px-2 sm:px-3"
        >
          <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Configurar</span>
        </Button>
      );
    }

    if (document.status === "signing" && onSign) {
      buttons.push(
        <Button
          key="sign"
          variant="outline"
          size="sm"
          onClick={() => onSign(document.id)}
          className="h-7 sm:h-8 text-xs px-2 sm:px-3"
        >
          <FileSignature className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Assinar</span>
        </Button>
      );
    }

    if ((document.status === "signed" || document.status === "completed") && onDownload) {
      buttons.push(
        <Button
          key="download"
          variant="outline"
          size="sm"
          onClick={() => onDownload(document.id)}
          className="h-7 sm:h-8 text-xs px-2 sm:px-3"
        >
          <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Baixar</span>
        </Button>
      );
    }

    if (onDelete) {
      buttons.push(
        <Button
          key="delete"
          variant="outline"
          size="sm"
          onClick={() => onDelete(document.id)}
          className="h-7 sm:h-8 text-xs px-2 sm:px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Excluir</span>
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div className="space-y-4">
      {showSelection && onDeleteMultiple && selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="text-sm font-medium">
            {selectedIds.size} documento(s) selecionado(s)
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir Selecionados
          </Button>
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {showSelection && onDeleteMultiple && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                )}
                <TableHead className="min-w-[200px] sm:min-w-[250px]">Nome do Documento</TableHead>
                <TableHead className="hidden sm:table-cell min-w-[80px]">Páginas</TableHead>
                <TableHead className="hidden md:table-cell min-w-[150px]">Signatários</TableHead>
                <TableHead className="min-w-[100px] sm:min-w-[140px]">Status</TableHead>
                <TableHead className="hidden lg:table-cell min-w-[140px]">Data de Upload</TableHead>
                <TableHead className="min-w-[100px] sm:min-w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
        {documents.length === 0 ? (
          <TableRow>
            <TableCell 
              colSpan={showSelection && onDeleteMultiple ? 7 : 6} 
              className="text-center text-muted-foreground"
            >
              Nenhum documento cadastrado
            </TableCell>
          </TableRow>
        ) : (
          documents.map((document) => (
            <TableRow key={document.id}>
              {showSelection && onDeleteMultiple && (
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(document.id)}
                    onCheckedChange={(checked) => handleSelectOne(document.id, checked as boolean)}
                    aria-label={`Selecionar ${document.name}`}
                  />
                </TableCell>
              )}
              <TableCell className="font-medium">
                <div className="space-y-1">
                  <div className="max-w-[200px] sm:max-w-[250px] truncate" title={document.name}>
                    {document.name}
                  </div>
                  <div className="text-xs text-muted-foreground sm:hidden">
                    {document.pageCount} páginas • {document.signers.length} signatário(s)
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">{document.pageCount}</TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="space-y-1">
                  <div className="text-sm">{document.signers.length} signatário(s)</div>
                  {document.signers.length > 0 && (
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={document.signers.map((s) => s.name).join(", ")}>
                      {document.signers.slice(0, 2).map((s) => s.name).join(", ")}
                      {document.signers.length > 2 && "..."}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DocumentStatusBadge status={document.status} />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {formatDate(document.uploadedAt instanceof Date ? document.uploadedAt : new Date(document.uploadedAt))}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1 sm:gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                  {getActionButtons(document)}
                </div>
              </TableCell>
            </TableRow>
          )          )
        )}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}

