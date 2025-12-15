"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Página de redirecionamento para manter compatibilidade com links antigos
 * Redireciona para a nova página de login do Clerk
 */
export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const redirectUrl = searchParams.get("redirect_url");
    const newUrl = redirectUrl 
      ? `/auth/login?redirect=${encodeURIComponent(redirectUrl)}`
      : "/auth/login";
    
    router.replace(newUrl);
  }, [router, searchParams]);

  // Mostrar loading enquanto redireciona
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
        <p className="mt-4 text-sm text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}
