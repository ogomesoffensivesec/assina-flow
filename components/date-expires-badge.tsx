"use client";

import { Badge } from "@/components/ui/badge";
import { getValidityStatus } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

interface DateExpiresBadgeProps {
  validTo: Date;
  className?: string;
}

export function DateExpiresBadge({
  validTo,
  className,
}: DateExpiresBadgeProps) {
  const status = getValidityStatus(validTo);

  const variants = {
    valid: "bg-green-500/10 text-green-700 dark:text-green-400",
    expiring_soon: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    expired: "bg-red-500/10 text-red-700 dark:text-red-400",
  };

  const labels = {
    valid: "Válido",
    expiring_soon: "Próximo do vencimento",
    expired: "Vencido",
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

