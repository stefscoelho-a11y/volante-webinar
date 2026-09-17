-- AlterTable
ALTER TABLE "webinars" ADD COLUMN     "agendado_duracao_maxima_segundos" INTEGER,
ADD COLUMN     "agendado_pausado" BOOLEAN NOT NULL DEFAULT false;
