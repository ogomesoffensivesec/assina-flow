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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">Ordem</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Ações</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedSigners.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={showActions ? 6 : 5}
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
              <TableCell className="font-medium">{signer.name}</TableCell>
              <TableCell>{signer.email}</TableCell>
              <TableCell>
                {signer.signatureType === "digital_a1"
                  ? "Assinatura Digital A1"
                  : "Assinatura Eletrônica"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getStatusIcon(signer.status)}
                  <span className="text-sm">{getStatusLabel(signer.status)}</span>
                  {signer.signedAt && (
                    <span className="text-xs text-muted-foreground">
                      ({formatDateTime(signer.signedAt)})
                    </span>
                  )}
                </div>
              </TableCell>
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(signer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(signer.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
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
  );
}

