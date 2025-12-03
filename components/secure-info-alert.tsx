"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, AlertTriangle } from "lucide-react";

interface SecureInfoAlertProps {
  variant?: "default" | "warning";
  title?: string;
  description?: string;
}

export function SecureInfoAlert({
  variant = "default",
  title,
  description,
}: SecureInfoAlertProps) {
  const defaultTitle =
    variant === "warning"
      ? "Atenção: Segurança do Certificado"
      : "Informações de Segurança";

  const defaultDescription =
    variant === "warning"
      ? "Nunca compartilhe seu certificado digital ou sua senha com terceiros. Mantenha seus arquivos .pfx em local seguro e faça backup regularmente."
      : "Seu certificado digital é criptografado e armazenado de forma segura. Apenas você tem acesso à senha do certificado.";

  return (
    <Alert
      variant={variant === "warning" ? "destructive" : "default"}
      className="border-yellow-500/50 bg-yellow-500/5"
    >
      {variant === "warning" ? (
        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      ) : (
        <ShieldCheck className="h-4 w-4" />
      )}
      <AlertTitle className={variant === "warning" ? "text-yellow-800 dark:text-yellow-200" : ""}>
        {title || defaultTitle}
      </AlertTitle>
      <AlertDescription className={variant === "warning" ? "text-yellow-700 dark:text-yellow-300" : ""}>
        {description || defaultDescription}
      </AlertDescription>
    </Alert>
  );
}

