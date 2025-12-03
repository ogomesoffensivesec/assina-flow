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

const signerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  signatureType: z.enum(["digital_a1", "electronic"]),
  order: z.number().min(1, "Ordem deve ser maior que 0"),
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
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<SignerFormData>({
    resolver: zodResolver(signerSchema),
    defaultValues: {
      name: signer?.name || "",
      email: signer?.email || "",
      signatureType: signer?.signatureType || "digital_a1",
      order: signer?.order || maxOrder + 1,
    },
  });

  useEffect(() => {
    if (signer) {
      reset({
        name: signer.name,
        email: signer.email,
        signatureType: signer.signatureType,
        order: signer.order,
      });
    } else {
      reset({
        name: "",
        email: "",
        signatureType: "digital_a1",
        order: maxOrder + 1,
      });
    }
  }, [signer, maxOrder, reset]);

  const onSubmit = (data: SignerFormData) => {
    onSave(data);
    onOpenChange(false);
    if (!signer) {
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {signer ? "Editar Signatário" : "Adicionar Signatário"}
          </DialogTitle>
          <DialogDescription>
            Configure as informações do signatário
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="João Silva"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="joao@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signatureType">Tipo de Assinatura</Label>
            <Select
              value={watch("signatureType")}
              onValueChange={(value) =>
                setValue("signatureType", value as "digital_a1" | "electronic")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="digital_a1">Assinatura Digital A1</SelectItem>
                <SelectItem value="electronic">Assinatura Eletrônica</SelectItem>
              </SelectContent>
            </Select>
            {errors.signatureType && (
              <p className="text-sm text-destructive">
                {errors.signatureType.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="order">Ordem de Assinatura</Label>
            <Input
              id="order"
              type="number"
              min={1}
              {...register("order", { valueAsNumber: true })}
            />
            {errors.order && (
              <p className="text-sm text-destructive">{errors.order.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

