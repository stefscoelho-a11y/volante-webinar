-- CreateIndex
CREATE UNIQUE INDEX "eventos_funil_webinar_id_lead_id_tipo_sessao_key" ON "eventos_funil"("webinar_id", "lead_id", "tipo", "sessao");
