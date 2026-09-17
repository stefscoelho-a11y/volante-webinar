-- CreateTable
CREATE TABLE "integracao_youtube" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "refresh_token" TEXT NOT NULL,
    "canal_id" TEXT,
    "canal_nome" TEXT,
    "conectado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integracao_youtube_pkey" PRIMARY KEY ("id")
);
