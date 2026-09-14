-- Links de acesso: cadastro opcional na sala principal, just in time
-- independente do tipo de agendamento, sala teste com token e replay
-- configuravel. Leads ganham token de acesso, origem e UTMs.

-- AlterTable
ALTER TABLE "webinars"
ADD COLUMN "exigir_cadastro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "just_in_time_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "token_sala_teste" TEXT,
ADD COLUMN "replay_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "replay_liberar_em" TIMESTAMP(3),
ADD COLUMN "replay_expirar_em" TIMESTAMP(3),
ADD COLUMN "replay_duracao_horas" INTEGER;

-- Webinars existentes ganham um token de sala teste aleatorio
UPDATE "webinars" SET "token_sala_teste" = gen_random_uuid()::text;
ALTER TABLE "webinars" ALTER COLUMN "token_sala_teste" SET NOT NULL;

-- AlterTable
ALTER TABLE "leads"
ADD COLUMN "telefone" TEXT,
ADD COLUMN "token_acesso" TEXT,
ADD COLUMN "origem" TEXT NOT NULL DEFAULT 'principal',
ADD COLUMN "utm_source" TEXT,
ADD COLUMN "utm_medium" TEXT,
ADD COLUMN "utm_campaign" TEXT,
ADD COLUMN "utm_content" TEXT,
ADD COLUMN "utm_term" TEXT,
ALTER COLUMN "sessao_escolhida" DROP NOT NULL;

-- Ate aqui so o fluxo just in time criava leads
UPDATE "leads" SET "origem" = 'just_in_time', "token_acesso" = gen_random_uuid()::text;
ALTER TABLE "leads" ALTER COLUMN "token_acesso" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "webinars_token_sala_teste_key" ON "webinars"("token_sala_teste");

-- CreateIndex
CREATE UNIQUE INDEX "leads_token_acesso_key" ON "leads"("token_acesso");

-- CreateIndex
CREATE INDEX "leads_webinar_id_email_idx" ON "leads"("webinar_id", "email");
