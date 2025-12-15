import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Valida a requisição e retorna o usuário atual
 * Substitui a função validateRequest do Lucia
 */
export async function validateRequest() {
  const { userId } = await auth();
  
  if (!userId) {
    return {
      user: null,
      session: null,
    };
  }

  const user = await currentUser();
  
  if (!user) {
    return {
      user: null,
      session: null,
    };
  }

  return {
    user: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      firstName: user.firstName,
      lastName: user.lastName,
      role: (user.publicMetadata?.role as string) || "user",
      emailVerified: user.emailAddresses[0]?.verification?.status === "verified",
    },
    session: { id: userId }, // Compatibilidade com código existente
  };
}

/**
 * Requer autenticação e retorna o usuário atual
 * Lança erro se não autenticado
 */
export async function requireAuth() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await currentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }

  return {
    user: {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || "",
      firstName: user.firstName,
      lastName: user.lastName,
      role: (user.publicMetadata?.role as string) || "user",
      emailVerified: user.emailAddresses[0]?.verification?.status === "verified",
    },
    session: { id: userId }, // Compatibilidade com código existente
  };
}
