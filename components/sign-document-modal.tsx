"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Document } from "@/lib/stores/document-store";
import { Certificate } from "@/lib/stores/certificate-store";
import { formatFileSize } from "@/lib/utils/date";
import { FileSignature, Loader2 } from "lucide-react";

interface SignDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  certificates: Certificate[];
  onSign: (certificateId: string, reason: string, location: string) => void;
}

export function SignDocumentModal({
  open,
  onOpenChange,
  document,
  certificates,
  onSign,
}: SignDocumentModalProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<string>("");
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  const handleSign = async () => {
    if (!selectedCertificate || !reason || !location) {
      return;
    }

    setIsSigning(true);

    // Mock: Simular processo de assinatura
    await new Promise((resolve) => setTimeout(resolve, 2000));

    onSign(selectedCertificate, reason, location);
    setIsSigning(false);
    onOpenChange(false);

    // Reset form
    setSelectedCertificate("");
    setReason("");
    setLocation("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assinar Documento com Certificado A1</DialogTitle>
          <DialogDescription>
            Configure os parâmetros da assinatura digital
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resumo do Documento */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">{document.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(document.fileSize)} • Hash: {document.hash?.substring(0, 16)}...
            </p>
          </div>

          {/* Seletor de Certificado */}
          <div className="space-y-2">
            <Label htmlFor="certificate">Certificado</Label>
            <Select
              value={selectedCertificate}
              onValueChange={setSelectedCertificate}
            >
              <SelectTrigger id="certificate">
                <SelectValue placeholder="Selecione um certificado" />
              </SelectTrigger>
              <SelectContent>
                {certificates.map((cert) => (
                  <SelectItem key={cert.id} value={cert.id}>
                    {cert.name} ({cert.type === "PF" ? "PF" : "PJ"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo da Assinatura */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Assinatura</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Aprovação do documento"
            />
          </div>

          {/* Local da Assinatura */}
          <div className="space-y-2">
            <Label htmlFor="location">Local da Assinatura</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: São Paulo, SP, Brasil"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSigning}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSign}
            disabled={!selectedCertificate || !reason || !location || isSigning}
          >
            {isSigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assinando...
              </>
            ) : (
              <>
                <FileSignature className="mr-2 h-4 w-4" />
                Confirmar e Assinar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

