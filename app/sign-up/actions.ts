"use server";

import { db } from "@/lib/db";
import { lucia } from "@/lib/auth";
import { hash } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signUp(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");

  if (!email || typeof email !== "string" || email.length < 1) {
    return {
      error: "Email é obrigatório",
    };
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return {
      error: "Senha deve ter pelo menos 6 caracteres",
    };
  }

  // Verificar se o email já existe
  const existingUser = await db.user.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });

  if (existingUser) {
    return {
      error: "Este email já está cadastrado",
    };
  }

  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  const userId = generateIdFromEntropySize(10);

  try {
    await db.user.create({
      data: {
        id: userId,
        email: email.toLowerCase(),
        firstName: firstName?.toString() || null,
        lastName: lastName?.toString() || null,
        role: "user",
        password: {
          create: {
            hashedPassword: passwordHash,
          },
        },
      },
    });

    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);
    cookies().set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.attributes
    );

    redirect("/dashboard");
  } catch (error) {
    return {
      error: "Erro ao criar conta. Tente novamente.",
    };
  }
}

