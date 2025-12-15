import "dotenv/config";
import { db } from "../lib/db";
import { hash } from "@node-rs/argon2";
import { generateIdFromEntropySize } from "lucia";

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  try {
    // Verificar se o usuário admin já existe
    const existingAdmin = await db.user.findUnique({
      where: { email: "admin@signflow.com" },
    });

    if (existingAdmin) {
      console.log("✅ Usuário admin já existe. Pulando criação...");
      return;
    }
  } catch (error) {
    console.error("⚠️  Erro ao verificar usuário existente:", error);
    // Continuar tentando criar mesmo se houver erro na verificação
  }

  // Criar senha hasheada para o admin
  // Senha padrão: admin123 (você pode alterar depois)
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
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

