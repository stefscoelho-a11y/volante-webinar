import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// DATABASE_URL deve ser a connection string COM pooler (ex: Supabase
// "Connection pooling", porta 6543) - o app roda em ambiente serverless
// (Vercel), entao cada invocacao pode abrir uma conexao nova; sem pooler
// isso esgota o limite de conexoes do Postgres rapido.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
