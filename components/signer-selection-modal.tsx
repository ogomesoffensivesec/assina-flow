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
import { Certificate } from "@/lib/stores/certificate-store";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Mail, 
  CreditCard, 
  Plus, 
  X, 
  CheckCircle2,
  AlertCircle,
  FileSignature,
  ArrowRight,
  Phone,
  Tag
} from "lucide-react";
import { cn, validateCPF, validateCNPJ, formatCPF, formatCNPJ } from "@/lib/utils";

interface SignerWithCertificate {
  id: string;
  certificateId?: string; // Opcional agora
  name: string;
  email: string;
  documentNumber: string; // CPF ou CNPJ (obrigatório)
  documentType: "PF" | "PJ"; // PF ou PJ
  phoneNumber?: string;
  identification?: string;
  order: number;
}

interface SignerSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  certificates: Certificate[]; // Mantido para compatibilidade, mas não será usado
  onComplete: (signers: SignerWithCertificate[]) => void;
}

export function SignerSelectionModal({
  open,
  onOpenChange,
  documentId,
  certificates,
  onComplete,
}: SignerSelectionModalProps) {
  const [signers, setSigners] = useState<SignerWithCertificate[]>([]);
  const [currentName, setCurrentName] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentDocumentNumber, setCurrentDocumentNumber] = useState("");
  const [currentDocumentType, setCurrentDocumentType] = useState<"PF" | "PJ">("PF");
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState("");
  const [currentIdentification, setCurrentIdentification] = useState("");
  const [currentIdentificationOther, setCurrentIdentificationOther] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form quando modal abre/fecha
  useEffect(() => {
    if (!open) {
      setSigners([]);
      setCurrentName("");
      setCurrentEmail("");
      setCurrentDocumentNumber("");
      setCurrentDocumentType("PF");
      setCurrentPhoneNumber("");
      setCurrentIdentification("");
      setCurrentIdentificationOther("");
      setErrors({});
    }
  }, [open]);

  // Função para sanitizar nome removendo caracteres inválidos
  const sanitizeName = (name: string): string => {
    if (!name || typeof name !== "string") {
      return "";
    }
    
    // Remover caracteres de controle e normalizar espaços
    let sanitized = name
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove caracteres de controle
      .replace(/[\r\n\t]/g, " ") // Substitui quebras de linha e tabs por espaço
      .replace(/\s+/g, " ") // Normaliza espaços múltiplos
      .trim();
    
    // Remover caracteres especiais problemáticos, mantendo apenas letras, números, espaços e alguns caracteres permitidos
    sanitized = sanitized
      .replace(/[#@!$%^&*()_+=\[\]{}|\\:";<>?,/`~]/g, "") // Remove caracteres problemáticos
      .replace(/\s+/g, " ")
      .trim();
    
    return sanitized;
  };

  const validateCurrentSigner = (): boolean => {
    const newErrors: Record<string, string> = {};

    const trimmedName = currentName.trim();
    if (!trimmedName) {
      newErrors.name = "Nome é obrigatório";
    } else if (trimmedName.length < 2) {
      newErrors.name = "Nome deve ter pelo menos 2 caracteres";
    } else {
      // Validar caracteres permitidos: letras, números, espaços, hífen, apóstrofe e ponto
      // Não permitir caracteres especiais como #, @, !, etc.
      const validNamePattern = /^[\p{L}\p{M}\p{N}\s\-'\.]+$/u;
      if (!validNamePattern.test(trimmedName)) {
        newErrors.name = "Nome contém caracteres inválidos. Use apenas letras, números, espaços e os seguintes caracteres: - ' .";
      } else {
        // IMPORTANTE: Clicksign requer no mínimo nome e sobrenome (pelo menos 2 palavras)
        const nameParts = trimmedName.split(/\s+/).filter(part => part.length > 0);
        if (nameParts.length < 2) {
          newErrors.name = "Nome deve conter pelo menos nome e sobrenome (mínimo 2 palavras)";
        }
      }
    }

    if (!currentEmail.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail.trim())) {
      newErrors.email = "Email inválido";
    }

    // Validar WhatsApp
    if (!currentPhoneNumber.trim()) {
      newErrors.phoneNumber = "WhatsApp é obrigatório";
    }

    // Validar identificação
    if (!currentIdentification.trim()) {
      newErrors.identification = "Identificação é obrigatória";
    } else if (currentIdentification === "outro" && !currentIdentificationOther.trim()) {
      newErrors.identificationOther = "Informe a identificação";
    }

    // Validar documento (CPF/CNPJ)
    const cleanedDocument = currentDocumentNumber.trim().replace(/\D/g, "");
    if (!cleanedDocument) {
      newErrors.documentNumber = `${currentDocumentType === "PF" ? "CPF" : "CNPJ"} é obrigatório`;
    } else {
      const isValid = currentDocumentType === "PF" 
        ? validateCPF(cleanedDocument) 
        : validateCNPJ(cleanedDocument);
      if (!isValid) {
        newErrors.documentNumber = `${currentDocumentType === "PF" ? "CPF" : "CNPJ"} inválido`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddSigner = () => {
    if (!validateCurrentSigner()) {
      return;
    }

    // Sanitizar nome antes de adicionar
    const sanitizedName = sanitizeName(currentName);
    
    console.log("[DEBUG SignerModal] Adicionando signatário:", {
      originalName: currentName,
      sanitizedName,
      email: currentEmail.trim(),
    });
    
    if (sanitizedName.length < 2) {
      setErrors({ name: "Nome inválido após sanitização. Use apenas letras, números, espaços e os seguintes caracteres: - ' ." });
      return;
    }

    const cleanedDocument = currentDocumentNumber.trim().replace(/\D/g, "");
    const finalIdentification = currentIdentification === "outro" 
      ? currentIdentificationOther.trim() 
      : currentIdentification;
    
    const newSigner: SignerWithCertificate = {
      id: `temp-${Date.now()}`,
      name: sanitizedName, // Usar nome sanitizado
      email: currentEmail.trim(),
      documentNumber: cleanedDocument,
      documentType: currentDocumentType,
      phoneNumber: currentPhoneNumber.trim(),
      identification: finalIdentification,
      order: signers.length + 1,
    };

    setSigners([...signers, newSigner]);
    
    // Reset form
    setCurrentName("");
    setCurrentEmail("");
    setCurrentDocumentNumber("");
    setCurrentDocumentType("PF");
    setCurrentPhoneNumber("");
    setCurrentIdentification("");
    setCurrentIdentificationOther("");
    setErrors({});
  };

  const handleRemoveSigner = (id: string) => {
    const updated = signers
      .filter((s) => s.id !== id)
      .map((s, index) => ({ ...s, order: index + 1 }));
    setSigners(updated);
  };

  const handleProceed = async () => {
    if (signers.length === 0) {
      // Se não há signatários adicionados, tentar adicionar o atual
      if (!validateCurrentSigner()) {
        return;
      }
      handleAddSigner();
      // Aguardar um pouco para o estado atualizar
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (signers.length === 0) {
      setErrors({ form: "Adicione pelo menos um signatário" });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      console.log("[DEBUG SignerModal] Iniciando criação de signatários:", {
        documentId,
        signersCount: signers.length,
        signers: signers.map((s) => ({ name: s.name, email: s.email, certificateId: s.certificateId })),
      });

      // Sanitizar nomes e documentos antes de enviar
      const sanitizedSigners = signers.map((s) => ({
        ...s,
        name: sanitizeName(s.name), // Garantir que nome está sanitizado
        documentNumber: String(s.documentNumber).trim().replace(/\D/g, ""), // Remove formatação
      }));
      
      console.log("[DEBUG SignerModal] Signatários sanitizados antes de enviar:", {
        original: signers.map((s) => ({ name: s.name, email: s.email, documentNumber: s.documentNumber })),
        sanitized: sanitizedSigners.map((s) => ({ name: s.name, email: s.email, documentNumber: s.documentNumber })),
      });
      
      // Validar que todos os nomes são válidos após sanitização
      for (const signer of sanitizedSigners) {
        if (!signer.name || signer.name.length < 2) {
          throw new Error(`Nome do signatário "${signer.name}" é inválido após sanitização`);
        }
        
        // Validar documento
        const isValid = signer.documentType === "PF" 
          ? validateCPF(signer.documentNumber) 
          : validateCNPJ(signer.documentNumber);
        
        if (!isValid) {
          throw new Error(`${signer.documentType === "PF" ? "CPF" : "CNPJ"} inválido para o signatário "${signer.name}"`);
        }
      }

      // Criar signatários na API
      let response: Response;
      try {
        response = await fetch(`/api/documentos/${documentId}/signatarios/batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signers: sanitizedSigners.map((s) => ({
              certificateId: s.certificateId,
              name: s.name,
              email: s.email,
              documentNumber: s.documentNumber,
              documentType: s.documentType,
              phoneNumber: s.phoneNumber,
              identification: s.identification,
              order: s.order,
            })),
          }),
        });
      } catch (fetchError: any) {
        console.error("[DEBUG SignerModal] Erro na requisição fetch:", {
          name: fetchError?.name,
          message: fetchError?.message,
          stack: fetchError?.stack,
          fetchError,
        });
        throw new Error(`Erro de rede: ${fetchError?.message || "Não foi possível conectar ao servidor"}`);
      }

      console.log("[DEBUG SignerModal] Resposta da API recebida:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      let responseData: any;
      try {
        const responseText = await response.text();
        console.log("[DEBUG SignerModal] Resposta texto:", responseText);
        
        if (!responseText) {
          throw new Error("Resposta vazia do servidor");
        }

        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error("[DEBUG SignerModal] Erro ao fazer parse do JSON:", {
            responseText,
            parseError,
          });
          throw new Error(`Resposta inválida do servidor: ${responseText.substring(0, 100)}`);
        }
      } catch (parseError: any) {
        console.error("[DEBUG SignerModal] Erro ao processar resposta:", parseError);
        throw new Error(`Erro ao processar resposta: ${parseError?.message || "Resposta inválida"}`);
      }

      // Verificar se há erro na resposta (mesmo que status seja 200/207)
      if (responseData.error || !responseData.success) {
        console.error("[DEBUG SignerModal] Erro na resposta da API:", {
          status: response.status,
          statusText: response.statusText,
          responseData,
        });
        
        // Extrair mensagem de erro de forma segura
        let errorMessage = "Erro ao criar signatários";
        if (typeof responseData?.error === "string") {
          errorMessage = responseData.error;
        } else if (responseData?.error?.detail) {
          errorMessage = String(responseData.error.detail);
        } else if (responseData?.error?.message) {
          errorMessage = String(responseData.error.message);
        } else if (responseData?.message) {
          errorMessage = String(responseData.message);
        } else if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          // Se houver array de erros, formatar mensagem
          const errorStrings = responseData.errors.map((e: any) => {
            if (typeof e === "string") return e;
            if (e?.error) return String(e.error);
            if (e?.message) return String(e.message);
            if (e?.detail) return String(e.detail);
            return String(e);
          });
          errorMessage = errorStrings.join("; ");
        }
        
        throw new Error(errorMessage);
      }

      // Verificar status HTTP apenas se não tivermos processado o erro acima
      if (!response.ok && response.status !== 207) {
        console.error("[DEBUG SignerModal] Erro HTTP na API:", {
          status: response.status,
          statusText: response.statusText,
          responseData,
        });
        // Extrair mensagem de erro de forma segura
        let errorMessage = `Erro ${response.status}: ${response.statusText}`;
        if (typeof responseData?.error === "string") {
          errorMessage = responseData.error;
        } else if (responseData?.error && typeof responseData.error === "object") {
          errorMessage = String(responseData.error.detail || responseData.error.message || responseData.error);
        } else if (typeof responseData?.message === "string") {
          errorMessage = responseData.message;
        }
        throw new Error(errorMessage);
      }

      console.log("[DEBUG SignerModal] Dados da resposta:", {
        success: responseData.success,
        count: responseData.count,
        created: responseData.created,
        failed: responseData.failed,
        partial: responseData.partial,
        signersCreated: responseData.signers?.length || 0,
        documentStatus: responseData.documentStatus,
        totalSigners: responseData.totalSigners,
        fullResponse: responseData,
      });

      // Verificar se os signatários foram realmente criados
      // Aceitar resposta parcial (207) se pelo menos alguns signatários foram criados
      const createdCount = responseData.count || responseData.created || 0;
      const hasSigners = responseData.signers && responseData.signers.length > 0;
      const totalSigners = responseData.totalSigners || createdCount;
      
      console.log("[DEBUG SignerModal] Validação de criação:", {
        success: responseData.success,
        createdCount,
        hasSigners,
        totalSigners,
        partial: responseData.partial,
        failed: responseData.failed,
      });
      
      if (!responseData.success) {
        const errorMsg = responseData.error || "Erro ao criar signatários";
        throw new Error(errorMsg);
      }

      // Se houver erros parciais, verificar se pelo menos um foi criado
      if (responseData.partial) {
        if (createdCount === 0 && totalSigners === 0) {
          // Nenhum signatário foi criado
          const errorDetails = responseData.errors?.map((e: any) => {
            const name = typeof e?.name === "string" ? e.name : String(e?.name || "Desconhecido");
            const error = typeof e?.error === "string" ? e.error : String(e?.error || e?.message || "Erro desconhecido");
            return `${name}: ${error}`;
          }).join(", ") || "Erro desconhecido";
          throw new Error(`Nenhum signatário foi criado. Erros: ${errorDetails}`);
        } else if (createdCount > 0 || totalSigners > 0) {
          // Alguns signatários foram criados, continuar
          console.warn("[DEBUG SignerModal] Alguns signatários falharam, mas alguns foram criados:", {
            created: createdCount,
            totalSigners,
            failed: responseData.failed,
            errors: responseData.errors,
          });
          // Continuar mesmo com erros parciais se pelo menos um foi criado
        }
      }

      // Verificar se pelo menos um signatário foi criado (considerando todos os campos possíveis)
      if (createdCount === 0 && totalSigners === 0 && !hasSigners) {
        const errorDetails = responseData.errors?.map((e: any) => {
          const name = typeof e?.name === "string" ? e.name : String(e?.name || "Desconhecido");
          const error = typeof e?.error === "string" ? e.error : String(e?.error || e?.message || "Erro desconhecido");
          return `${name}: ${error}`;
        }).join(", ") || "Nenhum signatário foi criado";
        throw new Error(`Nenhum signatário foi criado. Tente novamente. ${errorDetails}`);
      }
      
      // Se chegou aqui, pelo menos um signatário foi criado
      console.log("[DEBUG SignerModal] Validação passou, signatários criados:", {
        createdCount,
        totalSigners,
        hasSigners,
      });

      // Aguardar um pouco para garantir que o banco foi atualizado
      console.log("[DEBUG SignerModal] Aguardando atualização do banco...");
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Chamar callback com os dados da resposta da API
      console.log("[DEBUG SignerModal] Chamando onComplete com dados:", {
        signersCount: signers.length,
        apiResponse: responseData,
      });
      onComplete(signers);
      onOpenChange(false);
    } catch (error: any) {
      console.error("[DEBUG SignerModal] Erro ao criar signatários:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        toString: error?.toString(),
        error: error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
      });
      
      const errorMessage = 
        error?.message || 
        error?.toString() || 
        (typeof error === 'string' ? error : "Erro desconhecido ao criar signatários");
      
      setErrors({ form: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5" />
            Configurar Signatários
          </DialogTitle>
          <DialogDescription>
            Configure os dados dos signatários que irão assinar o documento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Lista de Signatários Adicionados */}
          {signers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Signatários Adicionados</h3>
                <Badge variant="outline">{signers.length}</Badge>
              </div>
              <div className="space-y-2">
                {signers.map((signer) => {
                  const cert = certificates.find((c) => c.id === signer.certificateId);
                  return (
                    <div
                      key={signer.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">{signer.name}</span>
                          <Badge variant="outline" className="text-xs">
                            #{signer.order}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground space-y-1">
                          <p>{signer.email}</p>
                          <p>{signer.documentType === "PF" ? "CPF" : "CNPJ"}: {signer.documentType === "PF" ? formatCPF(signer.documentNumber) : formatCNPJ(signer.documentNumber)}</p>
                          {signer.phoneNumber && <p>WhatsApp: {signer.phoneNumber}</p>}
                          {signer.identification && <p>Identificação: {signer.identification}</p>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSigner(signer.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formulário para Adicionar Signatário */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2 pb-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                {signers.length === 0 ? "Adicionar Primeiro Signatário" : "Adicionar Outro Signatário"}
              </h3>
            </div>

            {/* Campos do Signatário */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Dados do Signatário</h4>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      value={currentName}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Remover caracteres inválidos em tempo real (exceto os permitidos)
                        // Permitir: letras, números, espaços, hífen, apóstrofe, ponto
                        const sanitized = value.replace(/[^\p{L}\p{M}\p{N}\s\-'\.]/gu, "");
                        setCurrentName(sanitized);
                        if (errors.name) setErrors({ ...errors, name: "" });
                      }}
                      placeholder="João Silva"
                      className={cn(
                        "pl-9",
                        errors.name && "border-destructive focus-visible:ring-destructive"
                      )}
                      disabled={isSubmitting}
                      maxLength={255}
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={currentEmail}
                      onChange={(e) => {
                        setCurrentEmail(e.target.value);
                        if (errors.email) setErrors({ ...errors, email: "" });
                      }}
                      placeholder="joao@example.com"
                      className={cn(
                        "pl-9",
                        errors.email && "border-destructive focus-visible:ring-destructive"
                      )}
                      disabled={isSubmitting}
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="documentType" className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={currentDocumentType}
                    onValueChange={(value) => {
                      setCurrentDocumentType(value as "PF" | "PJ");
                      setCurrentDocumentNumber(""); // Limpar documento ao mudar tipo
                      if (errors.documentNumber) {
                        setErrors({ ...errors, documentNumber: "" });
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="documentType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value="PF">CPF (Pessoa Física)</SelectItem>
                      <SelectItem value="PJ">CNPJ (Pessoa Jurídica)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document" className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    {currentDocumentType === "PF" ? "CPF" : "CNPJ"} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="document"
                    value={currentDocumentNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      let formatted = value;
                      
                      if (currentDocumentType === "PF" && value.length <= 11) {
                        formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                        if (value.length <= 9) formatted = value.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
                        if (value.length <= 6) formatted = value.replace(/(\d{3})(\d{3})/, "$1.$2");
                        if (value.length <= 3) formatted = value;
                      } else if (currentDocumentType === "PJ" && value.length <= 14) {
                        formatted = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
                        if (value.length <= 12) formatted = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, "$1.$2.$3/$4");
                        if (value.length <= 8) formatted = value.replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
                        if (value.length <= 5) formatted = value.replace(/(\d{2})(\d{3})/, "$1.$2");
                        if (value.length <= 2) formatted = value;
                      }
                      
                      setCurrentDocumentNumber(formatted);
                      if (errors.documentNumber) {
                        setErrors({ ...errors, documentNumber: "" });
                      }
                    }}
                    placeholder={currentDocumentType === "PF" ? "123.456.789-00" : "12.345.678/0001-90"}
                    className={cn(
                      "pl-9",
                      errors.documentNumber && "border-destructive focus-visible:ring-destructive"
                    )}
                    disabled={isSubmitting}
                    maxLength={currentDocumentType === "PF" ? 14 : 18}
                  />
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {errors.documentNumber && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.documentNumber}
                  </p>
                )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  WhatsApp <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="phoneNumber"
                  value={currentPhoneNumber}
                  onChange={(e) => {
                    setCurrentPhoneNumber(e.target.value);
                    if (errors.phoneNumber) {
                      setErrors({ ...errors, phoneNumber: "" });
                    }
                  }}
                  placeholder="(11) 99999-9999"
                  className={cn(
                    errors.phoneNumber && "border-destructive focus-visible:ring-destructive"
                  )}
                  disabled={isSubmitting}
                />
                {errors.phoneNumber && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.phoneNumber}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="identification" className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Identificação <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={currentIdentification}
                  onValueChange={(value) => {
                    setCurrentIdentification(value);
                    if (value !== "outro") {
                      setCurrentIdentificationOther("");
                    }
                    if (errors.identification) {
                      setErrors({ ...errors, identification: "", identificationOther: "" });
                    }
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger 
                    id="identification"
                    className={cn(
                      "w-full",
                      errors.identification && "border-destructive focus:ring-destructive"
                    )}
                  >
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    <SelectItem value="comprador">Comprador</SelectItem>
                    <SelectItem value="locador">Locador</SelectItem>
                    <SelectItem value="locatario">Locatário</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="testemunha">Testemunha</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {errors.identification && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.identification}
                  </p>
                )}
                
                {currentIdentification === "outro" && (
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="identificationOther" className="text-sm font-medium">
                      Especifique a identificação <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="identificationOther"
                      value={currentIdentificationOther}
                      onChange={(e) => {
                        setCurrentIdentificationOther(e.target.value);
                        if (errors.identificationOther) {
                          setErrors({ ...errors, identificationOther: "" });
                        }
                      }}
                      placeholder="Ex: Fiador, Procurador, etc."
                      className={cn(
                        errors.identificationOther && "border-destructive focus-visible:ring-destructive"
                      )}
                      disabled={isSubmitting}
                    />
                    {errors.identificationOther && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.identificationOther}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleAddSigner}
                disabled={isSubmitting}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar à Lista
              </Button>
            </div>

            {/* Erro de formulário */}
            {errors.form && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.form}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-6 mt-6 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="sm:min-w-[100px]"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleProceed}
            disabled={isSubmitting || signers.length === 0}
            className="sm:min-w-[180px]"
          >
            {isSubmitting ? (
              <>
                <span className="animate-pulse mr-2">⏳</span>
                Processando...
              </>
            ) : (
              <>
                Prosseguir para Assinatura
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

