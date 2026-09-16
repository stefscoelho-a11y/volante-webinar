-- CreateTable
CREATE TABLE "membros" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "membros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "membros_email_key" ON "membros"("email");

-- CreateIndex
CREATE UNIQUE INDEX "membros_session_token_key" ON "membros"("session_token");
