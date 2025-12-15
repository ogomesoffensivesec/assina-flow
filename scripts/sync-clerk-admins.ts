import "dotenv/config";
import { db } from "../lib/db";
import * as fs from "fs";
import * as path from "path";

interface ClerkUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  clerkUserId: string;
  passwordHash: string;
}

async function syncClerkAdmins() {
  console.log("🔄 Iniciando sincronização de usuários admin do Clerk...\n");

  try {
    // Ler arquivo JSON
    // Primeiro tenta usar argumento da linha de comando, depois tenta o caminho padrão
    const customPath = process.argv[2];
    const defaultPath = path.join(process.cwd(), "scripts", "clerk-users.json");
    const jsonPath = customPath || defaultPath;

    // Tentar ler o arquivo
    let jsonContent: string;
    try {
      console.log(`📁 Lendo arquivo: ${jsonPath}`);
      jsonContent = fs.readFileSync(jsonPath, "utf-8");
    } catch (error) {
      console.error("❌ Erro ao ler arquivo JSON:", error);
      console.log("\n💡 Dica: Coloque o arquivo JSON em scripts/clerk-users.json");
      console.log("   Ou passe o caminho como argumento:");
      console.log("   pnpm sync-clerk-admins <caminho-do-json>");
      throw new Error("Arquivo JSON não encontrado");
    }

    const users: ClerkUser[] = JSON.parse(jsonContent);
    console.log(`📊 Total de usuários no JSON: ${users.length}`);

    // Filtrar apenas admins
    const adminUsers = users.filter((user) => user.role === "org:admin");
    console.log(`👑 Usuários admin encontrados: ${adminUsers.length}\n`);

    if (adminUsers.length === 0) {
      console.log("⚠️  Nenhum usuário admin encontrado no JSON.");
      return;
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors: Array<{ email: string; error: string }> = [];

    // Processar cada usuário admin
    for (const clerkUser of adminUsers) {
      try {
        const email = clerkUser.email.toLowerCase().trim();
        const clerkUserId = clerkUser.clerkUserId || clerkUser.id;

        // Verificar se usuário já existe (por email ou por clerkUserId)
        const existingByEmail = await db.user.findUnique({
          where: { email },
        });

        const existingByClerkId = clerkUserId
          ? await db.user.findFirst({
              where: {
                id: clerkUserId,
              },
            })
          : null;

        const existingUser = existingByEmail || existingByClerkId;

        if (existingUser) {
          // Atualizar usuário existente
          const updateData: any = {
            firstName: clerkUser.firstName || null,
            lastName: clerkUser.lastName || null,
            role: "admin", // Converter org:admin para admin
            emailVerified: true, // Assumir que usuários do Clerk estão verificados
            // Manter createdAt e updatedAt do banco, não atualizar com dados do JSON
          };

          // Se o ID é diferente (migração de ID), precisamos atualizar
          if (existingUser.id !== clerkUserId && clerkUserId) {
            console.log(
              `⚠️  Usuário ${email} tem ID diferente. Atualizando ID de ${existingUser.id} para ${clerkUserId}`
            );
            // Não podemos atualizar o ID diretamente, então criamos novo e deletamos antigo
            // Mas isso pode quebrar relacionamentos, então vamos apenas atualizar os dados
            console.log(`   Mantendo ID existente: ${existingUser.id}`);
          }

          await db.user.update({
            where: { id: existingUser.id },
            data: updateData,
          });

          updated++;
          console.log(`✅ Atualizado: ${email} (${clerkUser.firstName} ${clerkUser.lastName})`);
        } else {
          // Criar novo usuário
          const userId = clerkUserId || clerkUser.id;

          // Converter datas do formato do JSON para Date
          let createdAt: Date | undefined;
          let updatedAt: Date | undefined;
          
          try {
            if (clerkUser.createdAt) {
              // Formato: "2025-11-03 19:42:16.655"
              createdAt = new Date(clerkUser.createdAt.replace(" ", "T"));
            }
            if (clerkUser.updatedAt) {
              updatedAt = new Date(clerkUser.updatedAt.replace(" ", "T"));
            }
          } catch (dateError) {
            console.warn(`   Aviso: Erro ao converter datas para ${email}, usando datas padrão`);
          }

          await db.user.create({
            data: {
              id: userId,
              email,
              firstName: clerkUser.firstName || null,
              lastName: clerkUser.lastName || null,
              role: "admin", // Converter org:admin para admin
              emailVerified: true, // Assumir que usuários do Clerk estão verificados
              // Não criar password, pois estamos usando Clerk
              // createdAt e updatedAt serão definidos automaticamente pelo Prisma
            },
          });

          created++;
          console.log(`✨ Criado: ${email} (${clerkUser.firstName} ${clerkUser.lastName})`);
        }
      } catch (error: any) {
        const errorMsg = error.message || "Erro desconhecido";
        errors.push({ email: clerkUser.email, error: errorMsg });
        skipped++;
        console.error(`❌ Erro ao processar ${clerkUser.email}:`, errorMsg);
      }
    }

    // Resumo
    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMO DA SINCRONIZAÇÃO");
    console.log("=".repeat(50));
    console.log(`✨ Usuários criados: ${created}`);
    console.log(`🔄 Usuários atualizados: ${updated}`);
    console.log(`⏭️  Usuários ignorados (erros): ${skipped}`);
    console.log(`📝 Total processado: ${adminUsers.length}`);

    if (errors.length > 0) {
      console.log("\n❌ ERROS ENCONTRADOS:");
      errors.forEach(({ email, error }) => {
        console.log(`   - ${email}: ${error}`);
      });
    }

    console.log("\n✅ Sincronização concluída!");
  } catch (error: any) {
    console.error("\n❌ Erro fatal na sincronização:", error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Executar script
syncClerkAdmins()
  .catch((error) => {
    console.error("❌ Erro ao executar script:", error);
    process.exit(1);
  });

