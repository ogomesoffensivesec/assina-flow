"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Certificate } from "@/lib/stores/certificate-store";
import { DateExpiresBadge } from "@/components/date-expires-badge";
import { formatDate } from "@/lib/utils/date";
import { Eye, Trash2 } from "lucide-react";
import Link from "next/link";

interface CertificateCardProps {
  certificate: Certificate;
  onView?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function CertificateCard({
  certificate,
  onView,
  onDelete,
}: CertificateCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{certificate.name}</CardTitle>
            <CardDescription className="mt-1">
              {certificate.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
            </CardDescription>
          </div>
          <DateExpiresBadge validTo={certificate.validTo} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">CNPJ/CPF</p>
            <p className="text-sm font-medium">{certificate.cpfCnpj}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Validade</p>
            <p className="text-sm">
              {formatDate(certificate.validFrom)} até{" "}
              {formatDate(certificate.validTo)}
            </p>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Badge
              variant={certificate.status === "active" ? "default" : "secondary"}
            >
              {certificate.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          <div className="flex items-center gap-2 pt-2">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="flex-1"
              >
                <Link href={`/certificados/${certificate.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizar
                </Link>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(certificate.id)}
                className="flex-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

