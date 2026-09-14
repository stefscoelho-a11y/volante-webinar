-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "leads_webinar_id_telefone_idx" ON "leads"("webinar_id", "telefone");

