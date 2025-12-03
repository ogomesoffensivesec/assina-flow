import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyRequestOrigin } from "lucia";
import { lucia } from "./lib/auth";

// Rotas públicas
const publicRoutes = ["/", "/sign-in", "/sign-up"];
const adminRoutes = ["/usuarios"];

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some((route) => pathname.startsWith(route));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // Proteção CSRF para métodos não-GET
  if (request.method !== "GET") {
    const originHeader = request.headers.get("Origin");
    const hostHeader = request.headers.get("Host") ?? request.headers.get("X-Forwarded-Host");
    
    if (!originHeader || !hostHeader || !verifyRequestOrigin(originHeader, [hostHeader])) {
      return new NextResponse(null, {
        status: 403,
      });
    }
  }

  const pathname = request.nextUrl.pathname;

  // Permitir rotas públicas
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Validar sessão
  const sessionId = request.cookies.get(lucia.sessionCookieName)?.value ?? null;
  
  if (!sessionId) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    return NextResponse.redirect(signInUrl);
  }

  try {
    const { session, user } = await lucia.validateSession(sessionId);

    if (!session || !user) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect_url", request.url);
      const response = NextResponse.redirect(signInUrl);
      const blankCookie = lucia.createBlankSessionCookie();
      response.cookies.set(
        blankCookie.name,
        blankCookie.value,
        blankCookie.attributes
      );
      return response;
    }

    // Verificar rotas administrativas
    if (isAdminRoute(pathname)) {
      if (user.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // Atualizar cookie se a sessão foi renovada
    if (session.fresh) {
      const sessionCookie = lucia.createSessionCookie(session.id);
      const response = NextResponse.next();
      response.cookies.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
      return response;
    }

    return NextResponse.next();
  } catch {
    // Erro ao validar sessão - redirecionar para login
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect_url", request.url);
    const response = NextResponse.redirect(signInUrl);
    const blankCookie = lucia.createBlankSessionCookie();
    response.cookies.set(
      blankCookie.name,
      blankCookie.value,
      blankCookie.attributes
    );
    return response;
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

