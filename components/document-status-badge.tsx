"use client";

import { Badge } from "@/components/ui/badge";
import { DocumentStatus } from "@/lib/stores/document-store";
import { cn } from "@/lib/utils";

interface DocumentStatusBadgeProps {
  status: DocumentStatus;
  className?: string;
}

export function DocumentStatusBadge({
  status,
  className,
}: DocumentStatusBadgeProps) {
  const variants: Record<DocumentStatus, string> = {
    pending_config: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    pending_signature: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    signed: "bg-green-500/10 text-green-700 dark:text-green-400",
    error: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  const labels: Record<DocumentStatus, string> = {
    pending_config: "Aguardando configuração",
    pending_signature: "Aguardando assinatura",
    signed: "Assinado",
    error: "Erro",
  };

  return (
    <Badge
      variant="outline"
      className={cn(variants[status], className)}
    >
      {labels[status]}
    </Badge>
  );
}

