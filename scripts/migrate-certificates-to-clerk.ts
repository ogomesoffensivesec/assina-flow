import "dotenv/config";
import { db } from "../lib/db";
import * as fs from "fs";
import * as path from "path";

interface ClerkUser {
  id: string;
  email: string;
  clerkUserId: string;
}

/**
 * Script para migrar certificados e documentos do sistema antigo (Lucia) para Clerk
 * Mapeia usuários por email e atualiza os userId dos certificados e documentos
 */
async function migrateCertificatesToClerk() {
  console.log("🔄 Iniciando migração de certificados para Clerk...\n");

  try {
    // Ler arquivo JSON com usuários do Clerk
    const customPath = process.argv[2];
    const defaultPath = path.join(process.cwd(), "scripts", "clerk-users.json");
    const jsonPath = customPath || defaultPath;

    let jsonContent: string;
    try {
      console.log(`📁 Lendo arquivo: ${jsonPath}`);
      jsonContent = fs.readFileSync(jsonPath, "utf-8");
    } catch (error) {
      console.error("❌ Erro ao ler arquivo JSON:", error);
      console.log("\n💡 Dica: Coloque o arquivo JSON em scripts/clerk-users.json");
      console.log("   Ou passe o caminho como argumento:");
      console.log("   tsx scripts/migrate-certificates-to-clerk.ts <caminho-do-json>");
      throw new Error("Arquivo JSON não encontrado");
    }

    const clerkUsers: ClerkUser[] = JSON.parse(jsonContent);
    console.log(`📊 Total de usuários no JSON: ${clerkUsers.length}\n`);

    // Criar mapa de email -> clerkUserId
    const emailToClerkIdMap = new Map<string, string>();
    for (const clerkUser of clerkUsers) {
      const email = clerkUser.email.toLowerCase().trim();
      const clerkUserId = clerkUser.clerkUserId || clerkUser.id;
      emailToClerkIdMap.set(email, clerkUserId);
    }

    console.log(`📧 Mapeamento criado: ${emailToClerkIdMap.size} emails\n`);

    // Buscar todos os usuários no banco
    const dbUsers = await db.user.findMany({
      select: {
        id: true,
        email: true,
      },
    });

    console.log(`👥 Usuários no banco: ${dbUsers.length}\n`);

    // Criar mapa de userId antigo -> userId novo (Clerk)
    const userIdMigrationMap = new Map<string, string>();
    let usersFound = 0;
    let usersNotFound = 0;

    for (const dbUser of dbUsers) {
      const email = dbUser.email.toLowerCase().trim();
      const clerkUserId = emailToClerkIdMap.get(email);

      if (clerkUserId) {
        userIdMigrationMap.set(dbUser.id, clerkUserId);
        usersFound++;
        console.log(`✅ Mapeado: ${email}`);
        console.log(`   ID antigo: ${dbUser.id}`);
        console.log(`   ID novo (Clerk): ${clerkUserId}\n`);
      } else {
        usersNotFound++;
        console.warn(`⚠️  Usuário não encontrado no JSON: ${email} (ID: ${dbUser.id})`);
      }
    }

    console.log(`\n📊 Resumo de mapeamento:`);
    console.log(`   ✅ Usuários encontrados: ${usersFound}`);
    console.log(`   ⚠️  Usuários não encontrados: ${usersNotFound}\n`);

    if (userIdMigrationMap.size === 0) {
      console.log("⚠️  Nenhum usuário para migrar. Encerrando.");
      return;
    }

    // Migrar certificados
    console.log("📜 Migrando certificados...\n");
    let certificatesMigrated = 0;
    let certificatesSkipped = 0;

    for (const [oldUserId, newUserId] of userIdMigrationMap.entries()) {
      try {
        const result = await db.certificate.updateMany({
          where: {
            userId: oldUserId,
          },
          data: {
            userId: newUserId,
          },
        });

        if (result.count > 0) {
          certificatesMigrated += result.count;
          console.log(`✅ Migrados ${result.count} certificado(s) de ${oldUserId} para ${newUserId}`);
        }
      } catch (error: any) {
        console.error(`❌ Erro ao migrar certificados de ${oldUserId}:`, error.message);
        certificatesSkipped++;
      }
    }

    // Migrar documentos
    console.log("\n📄 Migrando documentos...\n");
    let documentsMigrated = 0;
    let documentsSkipped = 0;

    for (const [oldUserId, newUserId] of userIdMigrationMap.entries()) {
      try {
        const result = await db.document.updateMany({
          where: {
            userId: oldUserId,
          },
          data: {
            userId: newUserId,
          },
        });

        if (result.count > 0) {
          documentsMigrated += result.count;
          console.log(`✅ Migrados ${result.count} documento(s) de ${oldUserId} para ${newUserId}`);
        }
      } catch (error: any) {
        console.error(`❌ Erro ao migrar documentos de ${oldUserId}:`, error.message);
        documentsSkipped++;
      }
    }

    // Resumo final
    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMO DA MIGRAÇÃO");
    console.log("=".repeat(50));
    console.log(`👥 Usuários mapeados: ${usersFound}`);
    console.log(`📜 Certificados migrados: ${certificatesMigrated}`);
    console.log(`📄 Documentos migrados: ${documentsMigrated}`);
    if (certificatesSkipped > 0 || documentsSkipped > 0) {
      console.log(`⚠️  Erros: ${certificatesSkipped} certificados, ${documentsSkipped} documentos`);
    }
    console.log("\n✅ Migração concluída!");
  } catch (error: any) {
    console.error("\n❌ Erro fatal na migração:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Executar script
migrateCertificatesToClerk()
  .catch((error) => {
    console.error("❌ Erro ao executar script:", error);
    process.exit(1);
  });

