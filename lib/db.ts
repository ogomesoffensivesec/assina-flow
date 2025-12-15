import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

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

console.log("databaseUrl", databaseUrl);
// Criar pool de conexão PostgreSQL com configurações de timeout
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: databaseUrl,
    max: 10, // máximo de conexões no pool
    idleTimeoutMillis: 30000, // tempo antes de fechar conexões idle
    connectionTimeoutMillis: 20000, // timeout para estabelecer conexão (aumentado para 20s)
    query_timeout: 30000, // timeout para queries (30s)
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
}

// Criar adaptador PostgreSQL
const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn", "query"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

