-- CreateTable
CREATE TABLE "eventos_funil" (
    "id" TEXT NOT NULL,
    "webinar_id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "tipo" TEXT NOT NULL,
    "sessao" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_funil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_funil_webinar_id_tipo_criado_em_idx" ON "eventos_funil"("webinar_id", "tipo", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "eventos_funil_webinar_id_visitante_id_tipo_sessao_key" ON "eventos_funil"("webinar_id", "visitante_id", "tipo", "sessao");

-- AddForeignKey
ALTER TABLE "eventos_funil" ADD CONSTRAINT "eventos_funil_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_funil" ADD CONSTRAINT "eventos_funil_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
