"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileCheck, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ForgotPasswordDialog } from "./forgot-password-dialog";
import { CodeVerificationForm } from "./code-verification-form";
import {
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldError,
} from "@/components/ui/field";

const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .transform((val) => val.trim().toLowerCase()),
  password: z.string().min(1, "Senha é obrigatória"),
});

type SignInFormData = z.infer<typeof signInSchema>;

type LoginStep = "credentials" | "second_factor";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const handleSuccessfulLogin = async (sessionId: string) => {
    try {
      console.log("[LOGIN] Ativando sessão:", sessionId);
      
      if (!setActive) {
        console.error("[LOGIN] setActive não está disponível");
        setError("Erro ao completar login. Tente novamente.");
        setIsLoading(false);
        return;
      }

      // Limpar estado de loading antes de ativar sessão
      setIsLoading(false);
      
      await setActive({ session: sessionId });
      console.log("[LOGIN] Sessão ativada com sucesso");
      
      const redirectUrl = searchParams.get("redirect") || "/dashboard";
      console.log("[LOGIN] Redirecionando para:", redirectUrl);
      
      // Aguardar um pouco para garantir que a sessão foi salva
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Usar router.push e depois window.location como fallback
      router.push(redirectUrl);
      
      // Fallback: se o router não funcionar em 500ms, usar window.location
      setTimeout(() => {
        if (window.location.pathname === "/auth/login") {
          console.log("[LOGIN] Router não funcionou, usando window.location");
          window.location.href = redirectUrl;
        }
      }, 500);
    } catch (error) {
      console.error("[LOGIN] Erro ao fazer login:", error);
      setError("Erro ao completar login. Tente novamente.");
      setIsLoading(false);
    }
  };

  const handleSignInWithCredentials = async (data: SignInFormData) => {
    if (!isLoaded) {
      setError("Sistema ainda não está pronto. Aguarde um momento.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("[LOGIN] Passo 1: Criando sessão de sign-in com credenciais");
      
      // Criar sessão de sign-in
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      });

      console.log("[LOGIN] Resultado do sign-in:", {
        status: result.status,
        supportedSecondFactors: result.supportedSecondFactors,
      });

      // CASO 1: Login completo sem 2FA
      if (result.status === "complete") {
        console.log("[LOGIN] Login completo sem 2FA");
        await handleSuccessfulLogin(result.createdSessionId!);
        return;
      }

      // CASO 2: Necessita segundo fator (código por email)
      if (result.status === "needs_second_factor") {
        console.log("[LOGIN] Passo 2: Necessita segundo fator");
        console.log("[LOGIN] Detalhes completos do resultado:", {
          status: result.status,
          supportedSecondFactors: result.supportedSecondFactors,
          secondFactorVerification: result.secondFactorVerification,
          allProperties: Object.keys(result),
        });
        
        // Armazenar email para exibir no próximo passo
        setUserEmail(data.email);

        // Tentar preparar o segundo fator - isso envia o código por email
        // Tentamos mesmo se não aparecer na lista, pois o Clerk pode suportar mesmo assim
        try {
          console.log("[LOGIN] Tentando preparar segundo fator com email_code");
          
          // Tentar diferentes estratégias possíveis
          let prepResult;
          const strategies = ["email_code", "email_code:link", "totp"];
          
          for (const strategy of strategies) {
            try {
              console.log(`[LOGIN] Tentando estratégia: ${strategy}`);
              prepResult = await signIn.prepareSecondFactor({
                strategy: strategy as any,
              });
              console.log(`[LOGIN] Sucesso com estratégia: ${strategy}`, prepResult);
              break;
            } catch (strategyError: any) {
              console.log(`[LOGIN] Estratégia ${strategy} falhou:`, strategyError.errors?.[0]?.code);
              // Continuar para próxima estratégia
            }
          }

          if (!prepResult) {
            throw new Error("Nenhuma estratégia de segundo fator funcionou");
          }

          console.log("[LOGIN] Código enviado com sucesso");

          // Mudar para o passo do código
          setStep("second_factor");

          toast.success("Código de verificação enviado para seu e-mail!");
        } catch (prepError: any) {
          console.error("[LOGIN] Erro ao preparar 2FA:", {
            error: prepError,
            errors: prepError.errors,
            code: prepError.errors?.[0]?.code,
            message: prepError.errors?.[0]?.message,
          });
          
          const prepErrorCode = prepError.errors?.[0]?.code;
          const prepErrorMsg =
            prepError.errors?.[0]?.message ||
            prepError.message ||
            "Erro ao enviar código";

          console.error("[LOGIN] Todas as estratégias falharam. Código de erro:", prepErrorCode);

          // Se o erro for que a estratégia não está disponível, tentar informar melhor
          if (prepErrorCode === "form_strategy_not_available" || 
              prepErrorCode === "strategy_not_available" ||
              prepErrorCode === "form_identifier_not_found") {
            setError(
              "Autenticação de dois fatores não está configurada corretamente no Clerk. " +
              "Por favor, verifique as configurações no dashboard do Clerk " +
              "(User & Authentication → Multi-factor) ou entre em contato com o suporte."
            );
          } else if (prepErrorCode === "form_identifier_not_found") {
            // Pode ser que o email não esteja cadastrado no Clerk
            setError("Email não encontrado. Verifique se o email está correto ou cadastre-se primeiro.");
          } else {
            setError(
              `Erro ao enviar código de verificação: ${prepErrorMsg}. ` +
              `Código de erro: ${prepErrorCode || "desconhecido"}. ` +
              "Tente fazer login novamente ou entre em contato com o suporte."
            );
          }
          
          toast.error("Erro ao enviar código de verificação");
          // Não mudar o step, manter no login
        }
        setIsLoading(false);
        return;
      }

      // Outros status
      if (result.status === "needs_new_password") {
        setError("Você precisa definir uma nova senha. Use a opção 'Esqueceu sua senha?'");
        setIsLoading(false);
        return;
      }

      // Status desconhecido ou não tratado
      setError("Erro ao realizar login. Tente novamente.");
      console.warn("[LOGIN] Status de login desconhecido:", result.status);
      setIsLoading(false);
    } catch (err: any) {
      console.error("[LOGIN] Erro completo no login:", {
        error: err,
        errors: err.errors,
        message: err.message,
        status: err.status,
        statusText: err.statusText,
      });

      // Extrair mensagem de erro do Clerk
      let errorMessage =
        "Erro ao realizar login. Verifique suas credenciais e tente novamente.";

      if (err.errors && Array.isArray(err.errors) && err.errors.length > 0) {
        const clerkError = err.errors[0];

        // Tratar erros específicos do Clerk
        if (clerkError.code === "form_identifier_not_found") {
          errorMessage = "Email ou senha incorretos. Verifique suas credenciais.";
        } else if (clerkError.code === "form_password_incorrect") {
          errorMessage = "Email ou senha incorretos. Verifique suas credenciais.";
        } else if (clerkError.code === "form_identifier_exists") {
          errorMessage =
            "Este email já está cadastrado com outro método de autenticação.";
        } else if (clerkError.code === "session_exists") {
          errorMessage = "Você já está logado. Redirecionando...";
          router.push("/dashboard");
          return;
        } else if (clerkError.code === "too_many_requests") {
          errorMessage =
            "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
        } else if (clerkError.code === "form_param_format_invalid") {
          errorMessage = "Formato de email inválido. Verifique o email digitado.";
        } else if (clerkError.code === "form_param_nil") {
          errorMessage = "Email e senha são obrigatórios.";
        } else if (clerkError.code === "form_password_pwned") {
          errorMessage =
            "Esta senha foi comprometida em vazamentos de dados. Use uma senha mais segura.";
        } else if (clerkError.code === "form_password_length_too_short") {
          errorMessage = "A senha é muito curta. Use pelo menos 8 caracteres.";
        } else if (clerkError.code === "form_password_not_strong_enough") {
          errorMessage =
            "A senha não é forte o suficiente. Use uma combinação de letras, números e símbolos.";
        } else if (clerkError.code === "user_locked") {
          errorMessage = "Sua conta foi bloqueada. Entre em contato com o suporte.";
        } else if (clerkError.code === "user_not_found") {
          errorMessage = "Email ou senha incorretos. Verifique suas credenciais.";
        } else if (clerkError.code === "verification_failed") {
          errorMessage = "Falha na verificação. Tente novamente.";
        } else if (clerkError.message) {
          errorMessage = clerkError.message;
        } else if (clerkError.longMessage) {
          errorMessage = clerkError.longMessage;
        }
      } else if (err.message) {
        if (err.message.includes("network") || err.message.includes("fetch")) {
          errorMessage = "Erro de conexão. Verifique sua internet e tente novamente.";
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    console.log("[LOGIN] Voltando para passo de credenciais");
    setStep("credentials");
    setError(null);
    setUserEmail("");
    reset({ email: "", password: "" });
    // Resetar o estado do signIn se necessário
    if (signIn && typeof (signIn as any).reset === "function") {
      (signIn as any).reset();
    }
  };

  const handleResendCode = async () => {
    if (!signIn) {
      throw new Error("SignIn não está disponível");
    }
    
    console.log("[LOGIN] Reenviando código de verificação");
    
    // Tentar diferentes estratégias
    const strategies = ["email_code", "email_code:link", "totp"];
    
    for (const strategy of strategies) {
      try {
        console.log(`[LOGIN] Tentando reenviar com estratégia: ${strategy}`);
        await signIn.prepareSecondFactor({
          strategy: strategy as any,
        });
        console.log(`[LOGIN] Código reenviado com sucesso usando: ${strategy}`);
        return;
      } catch (strategyError: any) {
        console.log(`[LOGIN] Estratégia ${strategy} falhou ao reenviar:`, strategyError.errors?.[0]?.code);
        // Se for a última estratégia, lançar o erro
        if (strategy === strategies[strategies.length - 1]) {
          throw strategyError;
        }
      }
    }
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <FileCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Sign Flow</CardTitle>
            <CardDescription>Sistema de Assinatura Digital</CardDescription>
          </CardHeader>
          <CardContent>
            {step === "credentials" ? (
              <form onSubmit={handleSubmit(handleSignInWithCredentials)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <FieldGroup>
                  <FieldSet>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      {...register("email")}
                      disabled={isLoading}
                    />
                    <FieldError message={errors.email?.message} />
                  </FieldSet>

                  <FieldSet>
                    <FieldLabel htmlFor="password">Senha</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      {...register("password")}
                      disabled={isLoading}
                    />
                    <FieldError message={errors.password?.message} />
                  </FieldSet>
                </FieldGroup>

                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Esqueceu sua senha?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading || !isLoaded}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : !isLoaded ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            ) : (
              <CodeVerificationForm
                userEmail={userEmail}
                onBack={handleBackToCredentials}
                onSuccess={handleSuccessfulLogin}
                onResendCode={handleResendCode}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <ForgotPasswordDialog
        open={showForgotPassword}
        onOpenChange={setShowForgotPassword}
      />
    </>
  );
}
