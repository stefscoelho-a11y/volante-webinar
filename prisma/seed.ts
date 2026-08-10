import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const WEBINAR_SLUG = "webinar-teste";

async function main() {
  await prisma.webinar.deleteMany({ where: { slug: WEBINAR_SLUG } });

  const webinar = await prisma.webinar.create({
    data: {
      titulo: "Como Escalar Seu Negócio com Tráfego Pago (Webinar de Teste)",
      slug: WEBINAR_SLUG,
      // Big Buck Bunny - video de dominio publico usado so pra ter algo real pra tocar
      videoUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
      videoDurationSeconds: 600,
      pitchTimestampSeconds: 300,
      ctaTexto: "Quero Garantir Minha Vaga Agora",
      ctaLink: "https://example.com/oferta",
      tipoAgendamento: "recorrente",
      intervaloRecorrenciaMinutos: 60,
      ativo: true,
      chatMessages: {
        create: [
          { timestampSegundos: 5, nomeAutor: "Sistema", texto: "Marina entrou na sala", tipo: "sistema", ordem: 0 },
          { timestampSegundos: 8, nomeAutor: "Sistema", texto: "João Pedro entrou na sala", tipo: "sistema", ordem: 1 },
          { timestampSegundos: 15, nomeAutor: "Marina Costa", texto: "Cheguei! Alguém mais de SP aqui?", tipo: "mensagem", ordem: 2 },
          { timestampSegundos: 22, nomeAutor: "João Pedro", texto: "Aqui do Rio! Ansioso pra esse conteúdo", tipo: "mensagem", ordem: 3 },
          { timestampSegundos: 40, nomeAutor: "Sistema", texto: "Camila Alves entrou na sala", tipo: "sistema", ordem: 4 },
          { timestampSegundos: 60, nomeAutor: "Camila Alves", texto: "Já anotando tudo aqui", tipo: "mensagem", ordem: 5 },
          { timestampSegundos: 90, nomeAutor: "Ricardo Souza", texto: "Isso funciona pra quem tá começando do zero?", tipo: "mensagem", ordem: 6 },
          { timestampSegundos: 120, nomeAutor: "Marina Costa", texto: "Muito bom esse exemplo!", tipo: "mensagem", ordem: 7 },
          { timestampSegundos: 160, nomeAutor: "Fernanda Lima", texto: "Gente, isso mudou minha visão completamente", tipo: "mensagem", ordem: 8 },
          { timestampSegundos: 200, nomeAutor: "João Pedro", texto: "Alguém sabe se vai ter replay?", tipo: "mensagem", ordem: 9 },
          { timestampSegundos: 240, nomeAutor: "Camila Alves", texto: "Quero saber mais sobre esse método", tipo: "mensagem", ordem: 10 },
          { timestampSegundos: 280, nomeAutor: "Ricardo Souza", texto: "Prontos pra novidade que vem aí?", tipo: "mensagem", ordem: 11 },
          { timestampSegundos: 305, nomeAutor: "Sistema", texto: "A oferta especial acabou de abrir!", tipo: "sistema", ordem: 12 },
          { timestampSegundos: 310, nomeAutor: "Fernanda Lima", texto: "Já cliquei no botão!!", tipo: "mensagem", ordem: 13 },
          { timestampSegundos: 330, nomeAutor: "Marina Costa", texto: "Vou garantir a minha vaga agora", tipo: "mensagem", ordem: 14 },
          { timestampSegundos: 380, nomeAutor: "Ricardo Souza", texto: "Alguém entrou já? Vale muito a pena", tipo: "mensagem", ordem: 15 },
          { timestampSegundos: 450, nomeAutor: "Camila Alves", texto: "Melhor investimento que fiz esse ano", tipo: "mensagem", ordem: 16 },
          { timestampSegundos: 520, nomeAutor: "João Pedro", texto: "As vagas estão acabando mesmo?", tipo: "mensagem", ordem: 17 },
          { timestampSegundos: 570, nomeAutor: "Sistema", texto: "Últimos minutos da sessão", tipo: "sistema", ordem: 18 },
        ],
      },
    },
  });

  console.log(`Webinar seed criado: ${webinar.titulo} (slug: ${webinar.slug})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
