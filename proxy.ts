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
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};

