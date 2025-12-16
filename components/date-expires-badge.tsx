"use client";

import { Badge } from "@/components/ui/badge";
import { getValidityStatus } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface DateExpiresBadgeProps {
  validTo: Date;
  className?: string;
  certificateId?: string;
  onClick?: () => void;
}

export function DateExpiresBadge({
  validTo,
  className,
  certificateId,
  onClick,
}: DateExpiresBadgeProps) {
  const router = useRouter();
  const status = getValidityStatus(validTo);
  const isClickable = status === "expired" || status === "expiring_soon";

  const variants = {
    valid: "bg-green-500/10 text-green-700 dark:text-green-400",
    expiring_soon: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 cursor-pointer hover:bg-yellow-500/20",
    expired: "bg-red-500/10 text-red-700 dark:text-red-400 cursor-pointer hover:bg-red-500/20",
  };

  const labels = {
    valid: "Válido",
    expiring_soon: "Próximo do vencimento",
    expired: "Vencido",
  };

  const handleClick = () => {
    if (isClickable) {
      if (onClick) {
        onClick();
      } else {
        router.push("/certificados/novo");
      }
    }
  };

  return (
    <Badge
      variant="outline"
      className={cn(variants[status], className)}
      onClick={handleClick}
      title={isClickable ? "Clique para substituir este certificado" : undefined}
    >
      {labels[status]}
    </Badge>
  );
}

