"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UserRoleBadgeProps {
  role: string | null | undefined;
  className?: string;
}

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    user: "Usuário",
    "org:admin": "Admin",
    "org:member": "Membro",
  };

  const roleVariants: Record<string, string> = {
    admin: "bg-red-500/10 text-red-700 dark:text-red-400",
    "org:admin": "bg-red-500/10 text-red-700 dark:text-red-400",
    user: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    "org:member": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  };

  const displayRole = role || "user";
  const label = roleLabels[displayRole] || displayRole;
  const variant = roleVariants[displayRole] || "bg-muted text-muted-foreground";

  return (
    <Badge variant="outline" className={cn(variant, className)}>
      {label}
    </Badge>
  );
}

