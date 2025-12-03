import { db } from "@/lib/db";
import { hash } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  role?: string;
}

export async function createUser(input: CreateUserInput) {
  try {
    // Verificar se o email já existe
    const existingUser = await db.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      return { success: false, error: "Email já está em uso" };
    }

    const userId = generateIdFromEntropySize(10);
    let passwordHash: string | undefined;

    if (input.password) {
      passwordHash = await hash(input.password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });
    }

    const user = await db.user.create({
      data: {
        id: userId,
        email: input.email.toLowerCase(),
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role || "user",
        ...(passwordHash && {
          password: {
            create: {
              hashedPassword: passwordHash,
            },
          },
        }),
      },
    });

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao criar usuário" };
  }
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  try {
    const user = await db.user.update({
      where: { id: userId },
      data: {
        ...(input.firstName !== undefined && { firstName: input.firstName }),
        ...(input.lastName !== undefined && { lastName: input.lastName }),
        ...(input.role !== undefined && { role: input.role }),
      },
    });
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao atualizar usuário" };
  }
}

export async function deleteUser(userId: string) {
  try {
    await db.user.delete({
      where: { id: userId },
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao excluir usuário" };
  }
}

export async function listUsers(options?: {
  limit?: number;
  offset?: number;
  query?: string;
}) {
  try {
    const where = options?.query
      ? {
          OR: [
            { email: { contains: options.query, mode: "insensitive" as const } },
            { firstName: { contains: options.query, mode: "insensitive" as const } },
            { lastName: { contains: options.query, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [users, totalCount] = await Promise.all([
      db.user.findMany({
        where,
        take: options?.limit || 50,
        skip: options?.offset || 0,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.user.count({ where }),
    ]);

    return {
      success: true,
      users: {
        data: users,
        totalCount,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao listar usuários" };
  }
}

export async function updateUserRole(userId: string, role: string) {
  try {
    const user = await db.user.update({
      where: { id: userId },
      data: { role },
    });
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message || "Erro ao atualizar role" };
  }
}

