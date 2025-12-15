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
import { Signer } from "@/lib/stores/document-store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, CreditCard, Hash, Phone, Tag } from "lucide-react";
import { cn, validateCPF, validateCNPJ, formatCPF, formatCNPJ } from "@/lib/utils";

const signerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  documentType: z.enum(["PF", "PJ"]),
  documentNumber: z.string().min(1, "CPF/CNPJ é obrigatório"),
  phoneNumber: z.string().min(1, "WhatsApp é obrigatório"),
  identification: z.string().min(1, "Identificação é obrigatória"),
  identificationOther: z.string().optional(),
  order: z.number().min(1, "Ordem deve ser maior que 0"),
}).superRefine((data, ctx) => {
  const cleaned = data.documentNumber.replace(/\D/g, "");
  if (data.documentType === "PF") {
    if (!validateCPF(cleaned)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CPF inválido",
        path: ["documentNumber"],
      });
    }
  } else {
    if (!validateCNPJ(cleaned)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CNPJ inválido",
        path: ["documentNumber"],
      });
    }
  }
  
  // Validar identificação "outro" se selecionado
  if (data.identification === "outro" && !data.identificationOther?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe a identificação",
      path: ["identificationOther"],
    });
  }
});

type SignerFormData = z.infer<typeof signerSchema>;

interface SignerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signer?: Signer;
  maxOrder: number;
  onSave: (data: SignerFormData) => void;
}

export function SignerModal({
  open,
  onOpenChange,
  signer,
  maxOrder,
  onSave,
}: SignerModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<SignerFormData>({
    resolver: zodResolver(signerSchema),
    defaultValues: {
      name: signer?.name || "",
      email: signer?.email || "",
      documentType: (signer?.documentType as "PF" | "PJ") || "PF",
      documentNumber: signer?.documentNumber || "",
      phoneNumber: signer?.phoneNumber || "",
      identification: signer?.identification || "",
      identificationOther: signer?.identification === "outro" ? signer?.identification : "",
      order: signer?.order || maxOrder + 1,
    },
    mode: "onChange", // Validação em tempo real
  });

  useEffect(() => {
    if (signer) {
      reset({
        name: signer.name,
        email: signer.email,
        documentType: (signer.documentType as "PF" | "PJ") || "PF",
        documentNumber: signer.documentNumber || "",
        phoneNumber: signer.phoneNumber || "",
        identification: signer.identification || "",
        identificationOther: signer.identification === "outro" ? signer.identification : "",
        order: signer.order,
      });
    } else {
      reset({
        name: "",
        email: "",
        documentType: "PF",
        documentNumber: "",
        phoneNumber: "",
        identification: "",
        identificationOther: "",
        order: maxOrder + 1,
      });
    }
  }, [signer, maxOrder, reset]);

  const onSubmit = async (data: SignerFormData) => {
    onSave(data);
    onOpenChange(false);
    if (!signer) {
      reset();
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      if (!signer) {
        reset();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-6"
      >
        <DialogHeader className="pb-4">
          <DialogTitle>
            {signer ? "Editar Signatário" : "Adicionar Signatário"}
          </DialogTitle>
          <DialogDescription>
            Configure as informações do signatário que irá assinar o documento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Grupo: Informações Pessoais */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b">
              <User className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Informações Pessoais</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-1 pt-1">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nome Completo <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="name"
                    {...register("name", {
                      onChange: () => trigger("name"),
                    })}
                    placeholder="João Silva"
                    className={cn(
                      "pl-9",
                      errors.name && "border-destructive focus-visible:ring-destructive"
                    )}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    disabled={isSubmitting}
                  />
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {errors.name && (
                  <p 
                    id="name-error"
                    className="text-sm text-destructive font-medium flex items-center gap-1"
                    role="alert"
                  >
                    {errors.name.message}
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
                    {...register("email", {
                      onChange: () => trigger("email"),
                    })}
                    placeholder="joao@example.com"
                    className={cn(
                      "pl-9",
                      errors.email && "border-destructive focus-visible:ring-destructive"
                    )}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    disabled={isSubmitting}
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {errors.email && (
                  <p 
                    id="email-error"
                    className="text-sm text-destructive font-medium flex items-center gap-1"
                    role="alert"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="documentType" className="text-sm font-medium">
                    Tipo <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={watch("documentType")}
                    onValueChange={(value) => {
                      setValue("documentType", value as "PF" | "PJ");
                      setValue("documentNumber", ""); // Limpar documento ao mudar tipo
                      trigger("documentNumber");
                    }}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="documentType"
                      className={cn(
                        "w-full",
                        errors.documentType && "border-destructive focus:ring-destructive"
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                      <SelectItem value="PF">CPF (Pessoa Física)</SelectItem>
                      <SelectItem value="PJ">CNPJ (Pessoa Jurídica)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.documentType && (
                    <p 
                      className="text-sm text-destructive font-medium flex items-center gap-1"
                      role="alert"
                    >
                      {errors.documentType.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="document" className="text-sm font-medium">
                    {watch("documentType") === "PF" ? "CPF" : "CNPJ"} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="documentNumber"
                      {...register("documentNumber", {
                        onChange: (e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          const type = watch("documentType");
                          let formatted = value;
                          
                          if (type === "PF" && value.length <= 11) {
                            formatted = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                            if (value.length <= 9) formatted = value.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
                            if (value.length <= 6) formatted = value.replace(/(\d{3})(\d{3})/, "$1.$2");
                            if (value.length <= 3) formatted = value;
                          } else if (type === "PJ" && value.length <= 14) {
                            formatted = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
                            if (value.length <= 12) formatted = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})/, "$1.$2.$3/$4");
                            if (value.length <= 8) formatted = value.replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
                            if (value.length <= 5) formatted = value.replace(/(\d{2})(\d{3})/, "$1.$2");
                            if (value.length <= 2) formatted = value;
                          }
                          
                          setValue("documentNumber", formatted, { shouldValidate: true });
                          trigger("documentNumber");
                        },
                      })}
                      placeholder={watch("documentType") === "PF" ? "123.456.789-00" : "12.345.678/0001-90"}
                      className={cn(
                        "pl-9",
                        errors.documentNumber && "border-destructive focus-visible:ring-destructive"
                      )}
                      aria-invalid={!!errors.documentNumber}
                      aria-describedby={errors.documentNumber ? "documentNumber-error" : undefined}
                      disabled={isSubmitting}
                      maxLength={watch("documentType") === "PF" ? 14 : 18}
                    />
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.documentNumber && (
                    <p 
                      id="documentNumber-error"
                      className="text-sm text-destructive font-medium flex items-center gap-1"
                      role="alert"
                    >
                      {errors.documentNumber.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium">
                  WhatsApp <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="phoneNumber"
                    {...register("phoneNumber")}
                    placeholder="(11) 99999-9999"
                    className={cn(
                      "pl-9",
                      errors.phoneNumber && "border-destructive focus-visible:ring-destructive"
                    )}
                    aria-invalid={!!errors.phoneNumber}
                    aria-describedby={errors.phoneNumber ? "phoneNumber-error" : undefined}
                    disabled={isSubmitting}
                  />
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {errors.phoneNumber && (
                  <p 
                    id="phoneNumber-error"
                    className="text-sm text-destructive font-medium flex items-center gap-1"
                    role="alert"
                  >
                    {errors.phoneNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="identification" className="text-sm font-medium">
                  Identificação <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={watch("identification") || ""}
                  onValueChange={(value) => {
                    setValue("identification", value);
                    if (value !== "outro") {
                      setValue("identificationOther", "");
                    }
                    trigger("identification");
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
                  <p 
                    className="text-sm text-destructive font-medium flex items-center gap-1"
                    role="alert"
                  >
                    {errors.identification.message}
                  </p>
                )}
                
                {watch("identification") === "outro" && (
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="identificationOther" className="text-sm font-medium">
                      Especifique a identificação <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="identificationOther"
                      {...register("identificationOther")}
                      placeholder="Ex: Fiador, Procurador, etc."
                      className={cn(
                        errors.identificationOther && "border-destructive focus-visible:ring-destructive"
                      )}
                      aria-invalid={!!errors.identificationOther}
                      aria-describedby={errors.identificationOther ? "identificationOther-error" : undefined}
                      disabled={isSubmitting}
                    />
                    {errors.identificationOther && (
                      <p 
                        id="identificationOther-error"
                        className="text-sm text-destructive font-medium flex items-center gap-1"
                        role="alert"
                      >
                        {errors.identificationOther.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grupo: Configurações de Assinatura */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Ordem de Assinatura</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-1 pt-1">

              <div className="space-y-2">
                <Label htmlFor="order" className="text-sm font-medium">
                  Ordem de Assinatura <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="order"
                    type="number"
                    min={1}
                    {...register("order", { 
                      valueAsNumber: true,
                      onChange: () => trigger("order"),
                    })}
                    className={cn(
                      "pl-9",
                      errors.order && "border-destructive focus-visible:ring-destructive"
                    )}
                    aria-invalid={!!errors.order}
                    aria-describedby={errors.order ? "order-error" : undefined}
                    disabled={isSubmitting}
                  />
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
                {errors.order && (
                  <p 
                    id="order-error"
                    className="text-sm text-destructive font-medium flex items-center gap-1"
                    role="alert"
                  >
                    {errors.order.message}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Define a ordem em que este signatário deve assinar
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-6 mt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="sm:min-w-[100px]"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="sm:min-w-[100px]"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-pulse mr-2">⏳</span>
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
