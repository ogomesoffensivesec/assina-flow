"use server";

import { db } from "@/lib/db";
import { lucia } from "@/lib/auth";
import { verify } from "@node-rs/argon2";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || typeof email !== "string" || email.length < 1) {
    return {
      error: "Email é obrigatório",
    };
  }

  if (!password || typeof password !== "string" || password.length < 1) {
    return {
      error: "Senha é obrigatória",
    };
  }

  try {
    const user = await db.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      include: {
        password: true,
      },
    });

    if (!user || !user.password) {
      return {
        error: "Email ou senha incorretos",
      };
    }

    const validPassword = await verify(user.password.hashedPassword, password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    if (!validPassword) {
      return {
        error: "Email ou senha incorretos",
      };
    }

    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    const cookieStore = await cookies();
    cookieStore.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    const redirectUrl = formData.get("redirect_url")?.toString() || "/dashboard";
    redirect(redirectUrl);
  } catch (error: any) {
    // NEXT_REDIRECT não é um erro - é como o Next.js implementa redirects
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      // Re-lançar o erro para que o Next.js possa processar o redirect
      throw error;
    }
    
    console.error("Erro ao fazer login:", error);
    
    // Tratar erros específicos do Prisma
    if (error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED" || error.code === "P1001") {
      return {
        error: "Erro de conexão com o banco de dados. Verifique se o servidor está rodando e tente novamente.",
      };
    }
    
    if (error.message?.includes("timeout") || error.message?.includes("TIMEOUT")) {
      return {
        error: "Tempo de conexão esgotado. O servidor pode estar sobrecarregado. Tente novamente em alguns instantes.",
      };
    }

    // Erro genérico
    return {
      error: error.message || "Erro ao realizar login. Tente novamente.",
    };
  }
}

