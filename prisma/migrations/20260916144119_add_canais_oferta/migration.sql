-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "canal_oferta" TEXT;

-- CreateTable
CREATE TABLE "canais_oferta" (
    "id" TEXT NOT NULL,
    "webinar_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "oferta_nome" TEXT,
    "oferta_titulo" TEXT,
    "oferta_imagem_url" TEXT,
    "oferta_descricao" TEXT,
    "preco_original" DOUBLE PRECISION,
    "preco_oferta" DOUBLE PRECISION,
    "cta_texto" TEXT,
    "cta_link" TEXT,
    "cta_countdown_minutos" INTEGER,
    "cta_desaparecer_segundos" INTEGER,
    "meta_pixel_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "canais_oferta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "canais_oferta_webinar_id_slug_key" ON "canais_oferta"("webinar_id", "slug");

-- AddForeignKey
ALTER TABLE "canais_oferta" ADD CONSTRAINT "canais_oferta_webinar_id_fkey" FOREIGN KEY ("webinar_id") REFERENCES "webinars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
