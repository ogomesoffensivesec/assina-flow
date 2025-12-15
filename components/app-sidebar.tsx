"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShieldCheck,
  FileText,
  FileCheck,
  History,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/lib/hooks/use-role";

const navigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Certificados",
    href: "/certificados",
    icon: ShieldCheck,
  },
  {
    title: "Documentos e Assinatura",
    href: "/documentos",
    icon: FileText,
  },
  {
    title: "Auditoria",
    href: "/auditoria",
    icon: History,
  },
];

const adminNavigation = [
  {
    title: "Usuários",
    href: "/usuarios",
    icon: Users,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { isAdmin } = useRole();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <div className="flex items-center gap-2">
          <FileCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold">Sign Flow</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
        {isAdmin && (
          <>
            <div className="my-2 border-t border-border" />
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              );
            })}
          </>
        )}
      </nav>
    </div>
  );
}

