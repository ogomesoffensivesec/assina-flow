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
    pending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    waiting_signers: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    signing: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    signed: "bg-green-500/10 text-green-700 dark:text-green-400",
    completed: "bg-green-600/10 text-green-800 dark:text-green-300",
  };

  const labels: Record<DocumentStatus, string> = {
    pending: "Pendente",
    waiting_signers: "Aguardando signatários",
    signing: "Assinando",
    signed: "Assinado",
    completed: "Concluído",
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

