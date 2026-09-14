-- CreateTable
CREATE TABLE "transcricoes" (
    "id" TEXT NOT NULL,
    "webinar_id" TEXT NOT NULL,
    "segmentos" JSONB NOT NULL,
    "formato" TEXT NOT NULL,
    "nome_arquivo" TEXT,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcricoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transcricoes_webinar_id_key" ON "transcricoes"("webinar_id");

-- AddForeignKey
ALTER TABLE "transcricoes" ADD CONSTRAINT "transcricoes_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

