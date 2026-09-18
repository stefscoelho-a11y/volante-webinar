-- AlterTable
ALTER TABLE "webinars" ADD COLUMN     "agente_foto_url" TEXT,
ADD COLUMN     "agente_ia_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "agente_informacoes_produto" TEXT,
ADD COLUMN     "agente_nome" TEXT,
ADD COLUMN     "agente_roteiro_aula" TEXT,
ADD COLUMN     "agente_tom" TEXT;
