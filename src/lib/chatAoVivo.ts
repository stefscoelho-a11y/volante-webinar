// Comentarios reais e presenca na sala. Pode ser importado no servidor e no navegador.

export const INTERVALO_SYNC_MS = 4000;
// Aba em segundo plano (a pessoa pode estar so ouvindo): sincroniza menos
export const INTERVALO_SYNC_OCULTO_MS = 15000;
// Sem sinal ha mais que isso, o visitante sai da lista de "assistindo agora"
export const ONLINE_ATE_SEGUNDOS = 45;
export const MAX_COMENTARIO = 500;
export const NOME_SUPORTE_PADRAO = "Suporte";
// Origem do lead de quem entrou no chat sem informar dados
export const ORIGEM_CONVIDADO = "convidado";

export type PaginaSala = "sala" | "replay";

export type ParticipanteChat = { nome: string; convidado: boolean };

export type ChatAoVivoConfig = {
  webinarId: string;
  pagina: PaginaSala;
  // Inicio da sessao ao vivo (ISO) ou "replay"
  sessao: string;
  participante: ParticipanteChat | null;
};

export type ComentarioAoVivo = {
  id: string;
  tipo: "participante" | "suporte";
  nomeAutor: string;
  texto: string;
  videoSegundos: number;
  criadoEm: string;
};

type ContatoParticipante = {
  email: string | null;
  whatsapp: string | null;
  convidado: boolean;
};

export type EspectadorAoVivo = ContatoParticipante & {
  visitanteId: string;
  nome: string | null;
  pagina: PaginaSala;
  videoSegundos: number;
  entrouEm: string;
};

export type ComentarioPainel = ContatoParticipante & {
  id: string;
  nomeAutor: string;
  texto: string;
  videoSegundos: number;
  pagina: PaginaSala;
  criadoEm: string;
  respostas: { id: string; nomeAutor: string; texto: string; criadoEm: string }[];
};

export type DadosAoVivo = {
  agora: string;
  totalAssistindo: number;
  assistindo: EspectadorAoVivo[];
  comentarios: ComentarioPainel[];
};

/** So digitos, com DDI. Numero brasileiro sem DDI (10 ou 11 digitos) ganha o 55. */
export function normalizarWhatsapp(valor: string): string | null {
  const digitos = valor.replace(/\D/g, "");
  const completo = digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;
  return completo.length >= 12 && completo.length <= 15 ? completo : null;
}

export function formatarWhatsapp(numero: string): string {
  const brasil = /^55(\d{2})(\d{4,5})(\d{4})$/.exec(numero);
  return brasil ? `+55 (${brasil[1]}) ${brasil[2]}-${brasil[3]}` : `+${numero}`;
}
