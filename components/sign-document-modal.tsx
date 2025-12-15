"use client";

import { useState, useEffect } from "react";
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
import { 
  FileSignature, 
  Loader2, 
  FileText, 
  MapPin, 
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SignDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
  certificates: Certificate[];
  onSign: (reason: string, location: string) => void;
}

interface FormErrors {
  reason?: string;
  location?: string;
}

export function SignDocumentModal({
  open,
  onOpenChange,
  document,
  certificates,
  onSign,
}: SignDocumentModalProps) {
  const [reason, setReason] = useState("");
  const [location, setLocation] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [apiError, setApiError] = useState<string>("");

  // Reset form quando o dialog abre/fecha
  useEffect(() => {
    if (!open) {
      setReason("");
      setLocation("");
      setErrors({});
      setTouched({});
      setApiError("");
    }
  }, [open]);

  // Validação em tempo real
  const validateField = (field: string, value: string) => {
    const newErrors: FormErrors = { ...errors };

    switch (field) {
      case "reason":
        if (!value.trim()) {
          newErrors.reason = "O motivo da assinatura é obrigatório";
        } else if (value.trim().length < 3) {
          newErrors.reason = "O motivo deve ter pelo menos 3 caracteres";
        } else {
          delete newErrors.reason;
        }
        break;
      case "location":
        if (!value.trim()) {
          newErrors.location = "O local da assinatura é obrigatório";
        } else if (value.trim().length < 3) {
          newErrors.location = "O local deve ter pelo menos 3 caracteres";
        } else {
          delete newErrors.location;
        }
        break;
    }

    setErrors(newErrors);
    return !newErrors[field as keyof FormErrors];
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    setTouched({ ...touched, reason: true });
    validateField("reason", value);
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    setTouched({ ...touched, location: true });
    validateField("location", value);
  };

  const validateForm = (): boolean => {
    const reasonValid = validateField("reason", reason);
    const locationValid = validateField("location", location);

    setTouched({
      reason: true,
      location: true,
    });

    return reasonValid && locationValid;
  };

  const handleSign = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSigning(true);
    setApiError("");

    try {
      // Chamar API de assinatura diretamente
      const response = await fetch(`/api/documentos/${document.id}/assinar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: reason.trim(),
          location: location.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao assinar documento");
      }

      const data = await response.json();
      
      // Chamar callback do componente pai
      onSign(reason.trim(), location.trim());
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao assinar:", error);
      setApiError(error.message || "Erro ao assinar documento. Tente novamente.");
    } finally {
      setIsSigning(false);
    }
  };

  const handleClose = () => {
    if (!isSigning) {
      onOpenChange(false);
    }
  };

  const isFormValid = reason.trim() && location.trim() && !Object.keys(errors).length;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-6"
      >
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Assinar Documento com Certificado A1
          </DialogTitle>
          <DialogDescription>
            Configure os parâmetros da assinatura digital. Todos os campos são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo do Documento */}
          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3 mb-2">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{document.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span>•</span>
                  <span className="font-mono">
                    Hash: {document.hash?.substring(0, 16)}...
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Signatários e Certificados */}
          {(document.signers || []).length > 0 && (
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2">
              <p className="text-sm font-semibold mb-2">Signatários configurados:</p>
              {(document.signers || []).map((signer, index) => {
                const cert = certificates.find((c) => c.id === signer.certificateId);
                return (
                  <div key={signer.id} className="flex items-start gap-2 p-2 rounded-md bg-background border border-border">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{signer.name}</p>
                      {cert && (
                        <p className="text-xs text-muted-foreground">
                          Certificado: {cert.name} • Válido até {new Date(cert.validTo).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Motivo da Assinatura */}
          <div className="space-y-2 pt-1">
            <Label htmlFor="reason" className="text-sm font-medium flex items-center gap-2">
              <FileSignature className="h-4 w-4" />
              Motivo da Assinatura <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => handleReasonChange(e.target.value)}
              placeholder="Ex: Aprovação do documento, Conformidade com regulamentação..."
              className={cn(
                touched.reason && errors.reason && "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={!!errors.reason}
              aria-describedby={errors.reason ? "reason-error" : undefined}
              disabled={isSigning}
            />
            {touched.reason && errors.reason && (
              <p 
                id="reason-error"
                className="text-sm text-destructive font-medium flex items-center gap-1"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" />
                {errors.reason}
              </p>
            )}
            {!errors.reason && reason && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Este motivo será incluído na assinatura digital do documento.
                </p>
              </div>
            )}
          </div>

          {/* Local da Assinatura */}
          <div className="space-y-2 pt-1">
            <Label htmlFor="location" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Local da Assinatura <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="Ex: São Paulo, SP, Brasil"
              className={cn(
                touched.location && errors.location && "border-destructive focus-visible:ring-destructive"
              )}
              aria-invalid={!!errors.location}
              aria-describedby={errors.location ? "location-error" : undefined}
              disabled={isSigning}
            />
            {touched.location && errors.location && (
              <p 
                id="location-error"
                className="text-sm text-destructive font-medium flex items-center gap-1"
                role="alert"
              >
                <AlertCircle className="h-4 w-4" />
                {errors.location}
              </p>
            )}
            {!errors.location && location && (
              <div className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Informe a cidade e estado onde a assinatura está sendo realizada.
                </p>
              </div>
            )}
          </div>

          {/* Resumo de Validação */}
          {hasErrors && touched.reason && touched.location && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Por favor, corrija os erros acima antes de continuar.
              </AlertDescription>
            </Alert>
          )}

          {/* Erro da API */}
          {apiError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {apiError}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-6 mt-6 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSigning}
            className="sm:min-w-[100px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSign}
            disabled={!isFormValid || isSigning || (document.signers || []).length === 0}
            className="sm:min-w-[150px]"
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
