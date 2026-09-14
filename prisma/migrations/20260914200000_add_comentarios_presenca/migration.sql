-- CreateTable
CREATE TABLE "comentarios" (
    "id" TEXT NOT NULL,
    "webinar_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'participante',
    "nome_autor" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "sessao" TEXT NOT NULL,
    "video_segundos" INTEGER NOT NULL,
    "responde_a_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presencas" (
    "id" TEXT NOT NULL,
    "webinar_id" TEXT NOT NULL,
    "visitante_id" TEXT NOT NULL,
    "lead_id" TEXT,
    "pagina" TEXT NOT NULL,
    "video_segundos" INTEGER NOT NULL,
    "entrou_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_sinal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presencas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comentarios_webinar_id_criado_em_idx" ON "comentarios"("webinar_id", "criado_em");

-- CreateIndex
CREATE INDEX "comentarios_lead_id_sessao_idx" ON "comentarios"("lead_id", "sessao");

-- CreateIndex
CREATE INDEX "presencas_webinar_id_ultimo_sinal_idx" ON "presencas"("webinar_id", "ultimo_sinal");

-- CreateIndex
CREATE UNIQUE INDEX "presencas_webinar_id_visitante_id_key" ON "presencas"("webinar_id", "visitante_id");

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_responde_a_id_fkey" FOREIGN KEY ("responde_a_id") REFERENCES "comentarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presencas" ADD CONSTRAINT "presencas_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

