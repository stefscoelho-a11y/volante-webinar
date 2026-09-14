// Comentarios reais e presenca na sala. Pode ser importado no servidor e no navegador.

export const INTERVALO_SYNC_MS = 4000;
// Aba em segundo plano (a pessoa pode estar so ouvindo): sincroniza menos
export const INTERVALO_SYNC_OCULTO_MS = 15000;
// Sem sinal ha mais que isso, o visitante sai da lista de "assistindo agora"
export const ONLINE_ATE_SEGUNDOS = 45;
export const MAX_COMENTARIO = 500;
export const NOME_SUPORTE_PADRAO = "Suporte";

export type PaginaSala = "sala" | "replay";

export type ChatAoVivoConfig = {
  webinarId: string;
  pagina: PaginaSala;
  // Inicio da sessao ao vivo (ISO) ou "replay"
  sessao: string;
  participante: { nome: string } | null;
};

export type ComentarioAoVivo = {
  id: string;
  tipo: "participante" | "suporte";
  nomeAutor: string;
  texto: string;
  videoSegundos: number;
  criadoEm: string;
};

export type EspectadorAoVivo = {
  visitanteId: string;
  nome: string | null;
  email: string | null;
  pagina: PaginaSala;
  videoSegundos: number;
  entrouEm: string;
};

export type ComentarioPainel = {
  id: string;
  nomeAutor: string;
  email: string;
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
