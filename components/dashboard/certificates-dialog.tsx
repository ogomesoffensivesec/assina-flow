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
import { formatDate } from "@/lib/utils/date";
import { ShieldCheck, AlertTriangle } from "lucide-react";

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
  const activeCertificates = certificates.filter((c) => c.status === "active");
  const expiredCertificates = certificates.filter(
    (c) => c.validityStatus === "expired"
  );
  const expiringSoon = certificates.filter(
    (c) => c.validityStatus === "expiring_soon"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[80vw] w-[80vw] h-[90vh] flex flex-col p-0" style={{ maxWidth: '80vw', width: '80vw' }}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Detalhes dos Certificados
          </DialogTitle>
          <DialogDescription>
            Visão completa de todos os certificados cadastrados
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
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
            <h3 className="text-lg font-semibold mb-4">Lista Completa</h3>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="min-w-[200px]">Nome</TableHead>
                      <TableHead className="min-w-[120px]">Tipo</TableHead>
                      <TableHead className="min-w-[150px]">CNPJ/CPF</TableHead>
                      <TableHead className="min-w-[200px]">Validade</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
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
                  certificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.name}</TableCell>
                      <TableCell>
                        {cert.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
                      </TableCell>
                      <TableCell>{cert.cpfCnpj}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {formatDate(new Date(cert.validFrom))} - {formatDate(new Date(cert.validTo))}
                          </div>
                          <DateExpiresBadge validTo={new Date(cert.validTo)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={cert.status === "active" ? "default" : "secondary"}
                        >
                          {cert.status === "active" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                  </TableBody>
                </Table>
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

