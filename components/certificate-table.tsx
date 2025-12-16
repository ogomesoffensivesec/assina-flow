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
import { formatDate, getValidityStatus } from "@/lib/utils/date";
import { formatDocument } from "@/lib/utils";
import { Eye, Trash2, Download, Key } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
  const router = useRouter();

  const handleReplaceCertificate = (certificateId: string) => {
    if (typeof window === 'undefined') {
      return; // Não fazer nada no SSR
    }

    const targetPath = "/certificados/novo";
    const currentPath = window.location.pathname;

    try {
      router.push(targetPath);
      
      // Fallback: se o router não funcionar em 500ms, usar window.location
      // Este é um padrão comum em produção onde router.push pode falhar silenciosamente
      setTimeout(() => {
        if (window.location.pathname === currentPath) {
          window.location.href = targetPath;
        }
      }, 500);
    } catch (error) {
      // Fallback imediato para window.location em caso de erro
      window.location.href = targetPath;
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px] min-w-[160px]">RESPONSÁVEL CERTIFICADO</TableHead>
              <TableHead className="hidden sm:table-cell min-w-[120px]">Tipo</TableHead>
              <TableHead className="hidden md:table-cell min-w-[150px]">CNPJ/CPF</TableHead>
              <TableHead className="min-w-[180px] sm:min-w-[220px]">Validade</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[100px]">Status</TableHead>
              <TableHead className="text-right w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
        {certificates.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground py-8 px-4">
              Nenhum certificado cadastrado
            </TableCell>
          </TableRow>
        ) : (
          certificates.map((certificate) => {
            let validToDate: Date;
            try {
              validToDate = new Date(certificate.validTo);
              if (isNaN(validToDate.getTime())) {
                throw new Error(`Invalid date: ${certificate.validTo}`);
              }
            } catch (error: any) {
              validToDate = new Date(); // Fallback para data atual
            }
            
            const validityStatus = getValidityStatus(validToDate);
            const isExpiredOrExpiring = validityStatus === "expired" || validityStatus === "expiring_soon";
            
            return (
              <TableRow 
                key={certificate.id}
                className={cn(
                  isExpiredOrExpiring && "cursor-pointer hover:bg-accent/50",
                  isExpiredOrExpiring && "transition-colors"
                )}
                onClick={() => {
                  if (isExpiredOrExpiring) {
                    handleReplaceCertificate(certificate.id);
                  }
                }}
              >
                <TableCell className="font-medium w-[160px]">
                  <div className="space-y-1">
                    <div className="truncate" title={certificate.name}>{certificate.name}</div>
                    <div className="text-xs text-muted-foreground sm:hidden truncate">
                      {certificate.type === "PF" ? "PF" : "PJ"} • {formatDocument(certificate.cpfCnpj, certificate.type)}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {certificate.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                </TableCell>
                <TableCell className="hidden md:table-cell">{formatDocument(certificate.cpfCnpj, certificate.type)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-xs sm:text-sm">
                      <span className="hidden sm:inline">{formatDate(new Date(certificate.validFrom))} - </span>
                      {formatDate(new Date(certificate.validTo))}
                    </div>
                    <DateExpiresBadge 
                      validTo={new Date(certificate.validTo)} 
                      certificateId={certificate.id}
                      onClick={() => handleReplaceCertificate(certificate.id)}
                    />
                  </div>
                </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge
                  variant={certificate.status === "active" ? "default" : "secondary"}
                >
                  {certificate.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex flex-col items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {onView && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 text-xs w-full sm:w-auto min-w-[90px]"
                    >
                      <Link href={`/certificados/${certificate.id}`} className="flex items-center justify-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Ver</span>
                      </Link>
                    </Button>
                  )}
                  {onViewPassword && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewPassword(certificate.id)}
                      className={cn(
                        "h-8 text-xs w-full sm:w-auto min-w-[90px]",
                        !certificate.hasPassword && "opacity-50"
                      )}
                      disabled={!certificate.hasPassword}
                    >
                      <Key className={cn(
                        "h-3.5 w-3.5 mr-1.5",
                        certificate.hasPassword && "text-primary"
                      )} />
                      <span>Senha</span>
                    </Button>
                  )}
                  {onDownload && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownload(certificate.id)}
                      className="h-8 text-xs w-full sm:w-auto min-w-[90px]"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      <span>Baixar</span>
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(certificate.id)}
                      className="h-8 text-xs w-full sm:w-auto min-w-[90px] text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      <span>Excluir</span>
                    </Button>
                  )}
                </div>
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

