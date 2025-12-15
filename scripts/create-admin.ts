import "dotenv/config";
import { db } from "../lib/db";
import { hash } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";

async function createAdmin() {
  try {
    console.log("🌱 Criando usuário super admin...");

    // Verificar se o usuário admin já existe
    const existingAdmin = await db.user.findUnique({
      where: { email: "admin@signflow.com" },
    });

    if (existingAdmin) {
      console.log("✅ Usuário admin já existe!");
      console.log("📧 Email: admin@signflow.com");
      return;
    }

    // Criar senha hasheada para o admin
    // Senha padrão: admin123
    const password = "admin123";
    const passwordHash = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    // Criar usuário super admin
    const userId = generateIdFromEntropySize(10);

    const admin = await db.user.create({
      data: {
        id: userId,
        email: "admin@signflow.com",
        firstName: "Super",
        lastName: "Admin",
        role: "admin",
        emailVerified: true,
        password: {
          create: {
            hashedPassword: passwordHash,
          },
        },
      },
    });

    console.log("✅ Usuário super admin criado com sucesso!");
    console.log("📧 Email: admin@signflow.com");
    console.log("🔑 Senha: admin123");
    console.log("👤 ID:", admin.id);
    console.log("⚠️  IMPORTANTE: Altere a senha após o primeiro login!");
  } catch (error) {
    console.error("❌ Erro ao criar usuário admin:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

createAdmin();

