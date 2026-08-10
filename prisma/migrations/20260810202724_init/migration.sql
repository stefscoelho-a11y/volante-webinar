-- CreateTable
CREATE TABLE "webinars" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "video_url" TEXT,
    "video_file_path" TEXT,
    "video_duration_seconds" INTEGER NOT NULL,
    "pitch_timestamp_seconds" INTEGER NOT NULL,
    "cta_texto" TEXT NOT NULL,
    "cta_link" TEXT NOT NULL,
    "oferta_nome" TEXT,
    "oferta_titulo" TEXT,
    "oferta_imagem_url" TEXT,
    "oferta_descricao" TEXT,
    "preco_original" DOUBLE PRECISION,
    "preco_oferta" DOUBLE PRECISION,
    "cta_countdown_minutos" INTEGER,
    "cta_desaparecer_segundos" INTEGER,
    "meta_pixel_id" TEXT,
    "sincronizar_video_com_horario" BOOLEAN NOT NULL DEFAULT true,
    "audiencia_fake_min" INTEGER,
    "audiencia_fake_max" INTEGER,
    "tipo_agendamento" TEXT NOT NULL DEFAULT 'fixo',
    "horarios_fixos" JSONB,
    "intervalo_recorrencia_minutos" INTEGER,
    "delay_just_in_time_minutos" INTEGER,
    "agendado_data_hora_inicio" TIMESTAMP(3),
    "agendado_data_hora_fim" TIMESTAMP(3),
    "agendado_repeticao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webinars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "webinar_id" TEXT NOT NULL,
    "timestamp_segundos" INTEGER NOT NULL,
    "nome_autor" TEXT NOT NULL,
    "avatar_url" TEXT,
    "texto" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'mensagem',
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "webinar_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "sessao_escolhida" TIMESTAMP(3) NOT NULL,
    "entrou_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webinars_slug_key" ON "webinars"("slug");

-- CreateIndex
CREATE INDEX "chat_messages_webinar_id_idx" ON "chat_messages"("webinar_id");

-- CreateIndex
CREATE INDEX "leads_webinar_id_idx" ON "leads"("webinar_id");

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
