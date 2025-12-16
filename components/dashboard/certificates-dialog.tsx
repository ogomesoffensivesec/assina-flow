"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Certificate } from "@/lib/stores/certificate-store";
import { DateExpiresBadge } from "@/components/date-expires-badge";
import { formatDate, getValidityStatus } from "@/lib/utils/date";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CertificatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificates: Certificate[];
}

export function CertificatesDialog({
  open,
  onOpenChange,
  certificates,
}: CertificatesDialogProps) {
  const router = useRouter();
  const activeCertificates = certificates.filter((c) => c.status === "active");
  const expiredCertificates = certificates.filter(
    (c) => c.validityStatus === "expired"
  );
  const expiringSoon = certificates.filter(
    (c) => c.validityStatus === "expiring_soon"
  );

  const handleReplaceCertificate = (certificateId: string) => {
    onOpenChange(false);
    router.push("/certificados/novo");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] w-full h-[95vh] sm:h-[90vh] flex flex-col p-0 mx-2 sm:mx-4">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Detalhes dos Certificados
          </DialogTitle>
          <DialogDescription>
            Visão completa de todos os certificados cadastrados
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-2xl font-bold text-primary">{activeCertificates.length}</div>
              <div className="text-sm text-muted-foreground">Ativos</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {expiringSoon.length}
              </div>
              <div className="text-sm text-muted-foreground">Próximos do Vencimento</div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {expiredCertificates.length}
              </div>
              <div className="text-sm text-muted-foreground">Vencidos</div>
            </div>
          </div>

          {/* Tabela de Certificados */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Lista Completa</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[40vh] sm:max-h-[50vh] overflow-y-auto">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="min-w-[150px] sm:min-w-[200px]">Nome</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[120px]">Tipo</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[150px]">CNPJ/CPF</TableHead>
                        <TableHead className="min-w-[180px] sm:min-w-[200px]">Validade</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[100px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                {certificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum certificado cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  certificates.map((cert) => {
                    const validityStatus = getValidityStatus(new Date(cert.validTo));
                    const isExpiredOrExpiring = validityStatus === "expired" || validityStatus === "expiring_soon";
                    
                    return (
                      <TableRow 
                        key={cert.id}
                        className={cn(
                          isExpiredOrExpiring && "cursor-pointer hover:bg-accent/50",
                          isExpiredOrExpiring && "transition-colors"
                        )}
                        onClick={() => isExpiredOrExpiring && handleReplaceCertificate(cert.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div>{cert.name}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {cert.type === "PF" ? "PF" : "PJ"} • {cert.cpfCnpj}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {cert.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{cert.cpfCnpj}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-xs sm:text-sm">
                              <span className="hidden sm:inline">{formatDate(new Date(cert.validFrom))} - </span>
                              {formatDate(new Date(cert.validTo))}
                            </div>
                            <div onClick={(e) => e.stopPropagation()}>
                              <DateExpiresBadge 
                                validTo={new Date(cert.validTo)} 
                                certificateId={cert.id}
                                onClick={() => handleReplaceCertificate(cert.id)}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge
                            variant={cert.status === "active" ? "default" : "secondary"}
                          >
                            {cert.status === "active" ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                  </TableBody>
                </Table>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas */}
          {expiringSoon.length > 0 && (
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                    Atenção: Certificados Próximos do Vencimento
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {expiringSoon.length} certificado(s) vence(m) em breve. Renove-os para
                    evitar interrupções.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

