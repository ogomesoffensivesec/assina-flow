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
import { Certificate } from "@/lib/stores/certificate-store";
import { DateExpiresBadge } from "@/components/date-expires-badge";
import { formatDate } from "@/lib/utils/date";
import { Eye, Trash2, Download, Key } from "lucide-react";
import Link from "next/link";

interface CertificateTableProps {
  certificates: Certificate[];
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  onViewPassword?: (id: string) => void;
}

export function CertificateTable({
  certificates,
  onView,
  onDelete,
  onDownload,
  onViewPassword,
}: CertificateTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Nome</TableHead>
              <TableHead className="min-w-[120px]">Tipo</TableHead>
              <TableHead className="min-w-[150px]">CNPJ/CPF</TableHead>
              <TableHead className="min-w-[220px]">Validade</TableHead>
              <TableHead className="min-w-[100px]">Status</TableHead>
              <TableHead className="text-right min-w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
        {certificates.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Nenhum certificado cadastrado
            </TableCell>
          </TableRow>
        ) : (
          certificates.map((certificate) => (
            <TableRow key={certificate.id}>
              <TableCell className="font-medium">
                {certificate.name}
              </TableCell>
              <TableCell>
                {certificate.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
              </TableCell>
              <TableCell>{certificate.cpfCnpj}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="text-sm">
                    {formatDate(new Date(certificate.validFrom))} - {formatDate(new Date(certificate.validTo))}
                  </div>
                  <DateExpiresBadge validTo={new Date(certificate.validTo)} />
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={certificate.status === "active" ? "default" : "secondary"}
                >
                  {certificate.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {onViewPassword && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewPassword(certificate.id)}
                      title={certificate.hasPassword ? "Ver senha salva" : "Sem senha salva"}
                      className={certificate.hasPassword ? "" : "opacity-50"}
                    >
                      <Key className={`h-4 w-4 ${certificate.hasPassword ? "text-primary" : ""}`} />
                    </Button>
                  )}
                  {onDownload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDownload(certificate.id)}
                      title="Baixar certificado"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {onView && (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                    >
                      <Link href={`/certificados/${certificate.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(certificate.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )          )
        )}
          </TableBody>
        </Table>
    </div>
  );
}

