import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Prisma Client Singleton para Next.js App Router
 * 
 * Seguindo as recomendações do Prisma 7:
 * - Singleton pattern para evitar múltiplas instâncias em DEV (HMR)
 * - Em produção, cada função serverless cria sua própria instância
 * - Prisma 7 requer adaptador quando usa engineType "client"
 * - Pool do PostgreSQL é gerenciado pelo adaptador
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Verificar se a URL do banco está configurada
const databaseUrl = process.env.AF_PRISMA_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "AF_PRISMA_DATABASE_URL não está configurada nas variáveis de ambiente"
  );
}

// Detectar se está usando Prisma Accelerate (prisma:// ou prisma+postgres://)
const isAccelerate = databaseUrl.startsWith("prisma://") || databaseUrl.startsWith("prisma+");

let db: PrismaClient;

if (isAccelerate) {
  // Se usar Accelerate, não usar adaptador pg - usar accelerateUrl diretamente
  console.warn(
    "⚠️  Detectado Prisma Accelerate. Usando accelerateUrl ao invés de adaptador pg."
  );
  
  db =
    globalForPrisma.prisma ??
    new PrismaClient({
      accelerateUrl: databaseUrl,
      log:
        process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
    });
  
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
  }
} else {
  // Conexão direta ao PostgreSQL - usar adaptador pg com Pool
  let connectionString = databaseUrl;
  
  // Remover prefixo "prisma+" se presente (formato específico do Prisma)
  // O Pool do pg precisa de postgres:// ou postgresql://
  if (connectionString.startsWith("prisma+")) {
    connectionString = connectionString.replace("prisma+", "");
  }

  // Criar pool PostgreSQL para o adaptador
  const pool =
    globalForPrisma.pool ??
    new Pool({
      connectionString,
      max: process.env.NODE_ENV === "production" ? 10 : 20,
      connectionTimeoutMillis: 10000, // 10 segundos
      idleTimeoutMillis: 30000, // 30 segundos
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pool = pool;
  }

  // Criar adaptador PostgreSQL
  const adapter = new PrismaPg(pool);

  // Criar Prisma Client com adaptador (obrigatório no Prisma 7)
  db =
    globalForPrisma.prisma ??
    new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === "development"
          ? ["error", "warn", "query"]
          : ["error"],
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
  }
}

export { db };
