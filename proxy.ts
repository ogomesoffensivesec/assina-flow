import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/documentos(.*)",
  "/certificados(.*)",
  "/usuarios(.*)",
  "/auditoria(.*)",
  "/api/documentos(.*)",
  "/api/certificados(.*)",
  "/api/users(.*)",
  "/api/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  try {
    const { userId } = await auth();
    const url = new URL(req.url);

    // Redirecionar usuários logados que tentam acessar /auth/... para /dashboard
    if (userId && url.pathname.startsWith('/auth/')) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Proteger rotas privadas
    if (isProtectedRoute(req)) {
      await auth.protect();
    }

    // Adicionar headers de segurança para todas as respostas
    const response = NextResponse.next();
    
    // Headers de segurança
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Remover header X-Powered-By (já configurado no next.config.ts, mas garantindo aqui também)
    response.headers.delete('X-Powered-By');
    
    return response;
  } catch (error: any) {
    // Em produção, não expor detalhes do erro
    console.error('[MIDDLEWARE] Erro no middleware:', process.env.NODE_ENV === 'development' ? error : 'Erro interno');
    
    // Se for erro de autenticação, deixar o Clerk lidar com isso
    if (error.statusCode === 401 || error.statusCode === 403) {
      throw error;
    }
    
    // Para outros erros, retornar resposta genérica
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

