"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSignIn } from "@clerk/nextjs";
import { Loader2, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

// Schema de validação
const codeSchema = z.object({
  code: z
    .string()
    .min(6, "O código deve ter pelo menos 6 caracteres")
    .max(6, "O código deve ter no máximo 6 caracteres")
    .regex(/^\d+$/, "O código deve conter apenas números"),
});

type CodeFormValues = z.infer<typeof codeSchema>;

interface CodeVerificationFormProps {
  userEmail: string;
  onBack: () => void;
  onSuccess: (sessionId: string) => Promise<void>;
  onResendCode: () => Promise<void>;
}

export function CodeVerificationForm({
  userEmail,
  onBack,
  onSuccess,
  onResendCode,
}: CodeVerificationFormProps) {
  const { isLoaded, signIn } = useSignIn();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const handleConfirmCode = async (data: CodeFormValues) => {
    if (!isLoaded || !signIn) {
      setError("Sistema de autenticação não está pronto.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("[CODE] Tentando validar código:", {
        codeLength: data.code.length,
        signInAvailable: !!signIn,
      });

      // Tentar diferentes estratégias se necessário
      let result;
      const strategies = ["email_code", "email_code:link", "totp"];
      
      for (const strategy of strategies) {
        try {
          console.log(`[CODE] Tentando validar com estratégia: ${strategy}`);
          result = await signIn.attemptSecondFactor({
            strategy: strategy as any,
            code: data.code,
          });
          console.log(`[CODE] Sucesso com estratégia: ${strategy}`, result);
          break;
        } catch (strategyError: any) {
          console.log(`[CODE] Estratégia ${strategy} falhou:`, strategyError.errors?.[0]?.code);
          // Se for a última estratégia, lançar o erro
          if (strategy === strategies[strategies.length - 1]) {
            throw strategyError;
          }
        }
      }
      
      if (!result) {
        throw new Error("Nenhuma estratégia funcionou");
      }

      if (result.status === "complete") {
        console.log("[CODE] Código validado com sucesso, completando login");
        await onSuccess(result.createdSessionId!);
        return;
      }

      setError("Código inválido ou expirado.");
      toast.error("Código inválido ou expirado");
      reset({ code: "" });
    } catch (err: any) {
      console.error("Erro ao validar código:", err);
      const errorMessage =
        err.errors?.[0]?.message ||
        err.message ||
        "Código inválido ou expirado. Verifique e tente novamente.";
      setError(errorMessage);
      toast.error("Erro ao validar código");
      reset({ code: "" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    reset({ code: "" });
    setError(null);
    onBack();
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResendCode();
      toast.success("Código reenviado! Verifique seu email.");
      reset({ code: "" });
    } catch (err: any) {
      console.error("[CODE] Erro ao reenviar código:", err);
      const errorMsg = err.errors?.[0]?.message || "Erro ao reenviar código";
      toast.error(errorMsg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleConfirmCode)} className="space-y-4">
      <FieldGroup>
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Verificação de Segurança</h2>
          <FieldDescription>
            Por segurança, enviamos um código de verificação para{" "}
            <span className="font-semibold text-foreground">{userEmail}</span>.
            <br />
            Digite o código abaixo para continuar.
          </FieldDescription>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <FieldSet>
          <FieldLabel htmlFor="code">Código de Verificação</FieldLabel>
          <Input
            id="code"
            type="text"
            placeholder="000000"
            maxLength={6}
            className="h-12 text-center text-2xl tracking-widest font-mono"
            {...register("code", {
              onChange: (e) => {
                // Permitir apenas números
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                e.target.value = value;
              },
            })}
            disabled={isLoading || isSubmitting}
            autoFocus
          />
          <FieldError message={errors.code?.message} />
          <FieldDescription>
            Digite o código de 6 dígitos enviado para seu e-mail
          </FieldDescription>
        </FieldSet>

        <div className="space-y-3">
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || !isLoaded}
            className="w-full h-12"
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-5 w-5" />
                Confirmar Código
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={isResending || isLoading}
              className="flex-1 h-12"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Reenviar código"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}
              className="flex-1 h-12"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </FieldGroup>
    </form>
  );
}

