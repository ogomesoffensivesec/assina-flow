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
import { Badge } from "@/components/ui/badge";
import { Signer } from "@/lib/stores/document-store";
import { formatDateTime } from "@/lib/utils/date";
import { formatCPF, formatCNPJ } from "@/lib/utils";
import { Edit, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface SignerListProps {
  signers: Signer[];
  onEdit?: (signer: Signer) => void;
  onDelete?: (signerId: string) => void;
  showActions?: boolean;
}

export function SignerList({
  signers,
  onEdit,
  onDelete,
  showActions = true,
}: SignerListProps) {
  const getStatusIcon = (status: Signer["status"]) => {
    switch (status) {
      case "signed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: Signer["status"]) => {
    switch (status) {
      case "signed":
        return "Assinado";
      case "error":
        return "Erro";
      default:
        return "Pendente";
    }
  };

  const sortedSigners = [...signers].sort((a, b) => a.order - b.order);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Ordem</TableHead>
            <TableHead className="min-w-[150px]">Nome</TableHead>
            <TableHead className="hidden md:table-cell min-w-[200px]">Email</TableHead>
            <TableHead className="min-w-[120px]">{signers[0]?.documentType === "PF" ? "CPF" : "CNPJ"}</TableHead>
            <TableHead className="hidden lg:table-cell min-w-[150px]">Tipo</TableHead>
            <TableHead className="min-w-[120px]">Status</TableHead>
            {showActions && <TableHead className="min-w-[100px]">Ações</TableHead>}
          </TableRow>
        </TableHeader>
      <TableBody>
        {sortedSigners.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={showActions ? 7 : 6}
              className="text-center text-muted-foreground"
            >
              Nenhum signatário configurado
            </TableCell>
          </TableRow>
        ) : (
          sortedSigners.map((signer) => (
            <TableRow key={signer.id}>
              <TableCell>
                <Badge variant="outline">{signer.order}</Badge>
              </TableCell>
              <TableCell className="font-medium">
                <div className="space-y-1">
                  <div>{signer.name}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{signer.email}</div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{signer.email}</TableCell>
              <TableCell>
                {signer.documentType === "PF" 
                  ? formatCPF(signer.documentNumber) 
                  : formatCNPJ(signer.documentNumber)}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {signer.signatureType === "digital_a1"
                  ? "Assinatura Digital A1"
                  : "Assinatura Eletrônica"}
              </TableCell>
              <TableCell>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-1.5">
                    {getStatusIcon(signer.status)}
                    <span className="text-xs sm:text-sm">{getStatusLabel(signer.status)}</span>
                  </div>
                  {signer.signedAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(typeof signer.signedAt === "string" ? new Date(signer.signedAt) : signer.signedAt)}
                    </span>
                  )}
                </div>
              </TableCell>
              {showActions && (
                <TableCell>
                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(signer)}
                        className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                      >
                        <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(signer.id)}
                        className="h-7 sm:h-8 text-xs px-2 sm:px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Excluir</span>
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
    </div>
  );
}

