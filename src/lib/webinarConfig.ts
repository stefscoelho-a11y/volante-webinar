import { Prisma, type ChatMessage, type Transcricao, type Webinar } from "@/generated/prisma/client";
import { lerSegmentos, type SegmentoTranscricao } from "@/lib/legendas";
import { parseTipoMensagem } from "@/lib/chatMensagens";
import { REPETICOES_AGENDADO, TIPOS_AGENDAMENTO } from "@/lib/scheduling";
import { FONTES_SALA, TEMAS_SALA, VISUAL_DEFAULTS } from "@/lib/webinarVisual";

/**
 * Configuracao completa de um webinar: tudo menos identidade (id, slug, token
 * da sala teste, data de criacao), status ativo e dados de participantes
 * (leads). Duplicar, exportar e importar passam por aqui, entao os tres
 * sempre levam exatamente os mesmos campos.
 */

const FORMATO_EXPORTACAO = "volante-webinar";
const VERSAO_EXPORTACAO = 1;
const MAX_MENSAGENS_CHAT = 5000;

type CampoForaDaConfig = "id" | "slug" | "tokenSalaTeste" | "criadoEm" | "ativo";
type CampoConfig = Exclude<keyof Webinar, CampoForaDaConfig>;

type TipoCampo =
  | "texto"
  | "textoOpcional"
  | "inteiro"
  | "inteiroOpcional"
  | "numeroOpcional"
  | "booleano"
  | "dataOpcional"
  | "horarios";

// Record completo de proposito: quando um campo novo entrar no model Webinar,
// o TypeScript so compila depois que ele for classificado aqui - e a partir
// dai ele e copiado no duplicar e vai no JSON automaticamente.
const CAMPOS: Record<CampoConfig, TipoCampo> = {
  titulo: "texto",
  videoUrl: "textoOpcional",
  videoFilePath: "textoOpcional",
  videoDurationSeconds: "inteiro",
  pitchTimestampSeconds: "inteiro",
  ctaTexto: "texto",
  ctaLink: "texto",
  ofertaNome: "textoOpcional",
  ofertaTitulo: "textoOpcional",
  ofertaImagemUrl: "textoOpcional",
  ofertaDescricao: "textoOpcional",
  precoOriginal: "numeroOpcional",
  precoOferta: "numeroOpcional",
  precoParcelado: "textoOpcional",
  ctaCountdownMinutos: "inteiroOpcional",
  ctaDesaparecerSegundos: "inteiroOpcional",
  metaPixelId: "textoOpcional",
  sincronizarVideoComHorario: "booleano",
  audienciaFakeMin: "inteiroOpcional",
  audienciaFakeMax: "inteiroOpcional",
  temaSala: "texto",
  corPrimaria: "texto",
  corFundo: "texto",
  corTexto: "texto",
  fonteSala: "texto",
  tipoAgendamento: "texto",
  horariosFixos: "horarios",
  intervaloRecorrenciaMinutos: "inteiroOpcional",
  delayJustInTimeMinutos: "inteiroOpcional",
  agendadoDataHoraInicio: "dataOpcional",
  agendadoDataHoraFim: "dataOpcional",
  agendadoRepeticao: "textoOpcional",
  agendadoPausado: "booleano",
  agendadoDuracaoMaximaSegundos: "inteiroOpcional",
  agenteIaAtivo: "booleano",
  agenteNome: "textoOpcional",
  agenteFotoUrl: "textoOpcional",
  agenteInformacoesProduto: "textoOpcional",
  agenteTom: "textoOpcional",
  agenteRoteiroAula: "textoOpcional",
  exigirCadastro: "booleano",
  justInTimeAtivo: "booleano",
  replayAtivo: "booleano",
  replayLiberarEm: "dataOpcional",
  replayExpirarEm: "dataOpcional",
  replayDuracaoHoras: "inteiroOpcional",
};

// Valor usado quando um JSON exportado por uma versao anterior nao tem o campo
const PADROES: Partial<Record<CampoConfig, unknown>> = {
  sincronizarVideoComHorario: true,
  exigirCadastro: false,
  justInTimeAtivo: false,
  replayAtivo: false,
  agendadoPausado: false,
  agenteIaAtivo: false,
  tipoAgendamento: "recorrente",
  ...VISUAL_DEFAULTS,
};

export type ConfigWebinar = Omit<Webinar, CampoForaDaConfig | "horariosFixos"> & { horariosFixos: string[] | null };
export type MensagemChatConfig = Pick<ChatMessage, "timestampSegundos" | "nomeAutor" | "avatarUrl" | "texto" | "tipo" | "ordem">;
export type TranscricaoConfig = { segmentos: SegmentoTranscricao[]; formato: string; nomeArquivo: string | null };

export type PacoteWebinar = {
  config: ConfigWebinar;
  chatMessages: MensagemChatConfig[];
  transcricao: TranscricaoConfig | null;
  slugOriginal: string;
};

type WebinarCompleto = Webinar & { chatMessages: ChatMessage[]; transcricao: Transcricao | null };

export function pacoteDoWebinar(webinar: WebinarCompleto): PacoteWebinar {
  const config = Object.fromEntries(
    Object.keys(CAMPOS).map((campo) => [campo, webinar[campo as CampoConfig]]),
  ) as ConfigWebinar;
  config.horariosFixos = Array.isArray(webinar.horariosFixos)
    ? webinar.horariosFixos.filter((horario): horario is string => typeof horario === "string")
    : null;

  return {
    config,
    slugOriginal: webinar.slug,
    chatMessages: [...webinar.chatMessages]
      .sort((a, b) => a.timestampSegundos - b.timestampSegundos || a.ordem - b.ordem)
      .map(({ timestampSegundos, nomeAutor, avatarUrl, texto, tipo, ordem }) => ({
        timestampSegundos,
        nomeAutor,
        avatarUrl,
        texto,
        tipo,
        ordem,
      })),
    transcricao: webinar.transcricao
      ? {
          segmentos: lerSegmentos(webinar.transcricao.segmentos),
          formato: webinar.transcricao.formato,
          nomeArquivo: webinar.transcricao.nomeArquivo,
        }
      : null,
  };
}

export function exportarJson(pacote: PacoteWebinar) {
  return {
    formato: FORMATO_EXPORTACAO,
    versao: VERSAO_EXPORTACAO,
    exportadoEm: new Date().toISOString(),
    slugOriginal: pacote.slugOriginal,
    webinar: pacote.config,
    chatMessages: pacote.chatMessages,
    transcricao: pacote.transcricao,
  };
}

/** Dados de criacao de um webinar novo a partir de um pacote (duplicado ou importado). */
export function dadosNovoWebinar(
  pacote: PacoteWebinar,
  identidade: { titulo: string; slug: string },
): Prisma.WebinarCreateInput {
  return {
    ...pacote.config,
    ...identidade,
    horariosFixos: pacote.config.horariosFixos ?? Prisma.JsonNull,
    // Comeca inativo de proposito: evita publicar sessoes duplicadas ou
    // importadas sem revisar antes.
    ativo: false,
    chatMessages: { create: pacote.chatMessages },
    transcricao: pacote.transcricao ? { create: pacote.transcricao } : undefined,
  };
}

function objeto(valor: unknown, nome: string): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Estrutura inválida em "${nome}".`);
  }
  return valor as Record<string, unknown>;
}

function erroCampo(campo: string): Error {
  return new Error(`Valor inválido no campo "${campo}" do arquivo.`);
}

function lerCampo(campo: string, tipo: TipoCampo, valor: unknown): unknown {
  const vazio = valor === undefined || valor === null;
  switch (tipo) {
    case "texto":
      if (typeof valor !== "string") throw erroCampo(campo);
      return valor;
    case "textoOpcional":
      if (vazio) return null;
      if (typeof valor !== "string") throw erroCampo(campo);
      return valor;
    case "inteiro":
      if (!Number.isInteger(valor)) throw erroCampo(campo);
      return valor;
    case "inteiroOpcional":
      if (vazio) return null;
      if (!Number.isInteger(valor)) throw erroCampo(campo);
      return valor;
    case "numeroOpcional":
      if (vazio) return null;
      if (typeof valor !== "number" || !Number.isFinite(valor)) throw erroCampo(campo);
      return valor;
    case "booleano":
      if (typeof valor !== "boolean") throw erroCampo(campo);
      return valor;
    case "dataOpcional": {
      if (vazio) return null;
      const data = typeof valor === "string" ? new Date(valor) : null;
      if (!data || Number.isNaN(data.getTime())) throw erroCampo(campo);
      return data;
    }
    case "horarios":
      if (vazio) return null;
      if (!Array.isArray(valor) || !valor.every((h) => typeof h === "string" && /^\d{1,2}:\d{2}$/.test(h))) {
        throw erroCampo(campo);
      }
      return valor;
  }
}

function incluido(lista: readonly string[], valor: unknown): boolean {
  return typeof valor === "string" && lista.includes(valor);
}

/** Valida um JSON exportado e devolve o pacote. Erros saem com mensagem pronta pra mostrar. */
export function lerJsonExportado(conteudo: unknown): PacoteWebinar {
  const raiz = objeto(conteudo, "arquivo");
  if (raiz.formato !== FORMATO_EXPORTACAO) {
    throw new Error("Este arquivo não é uma exportação de webinário do Volante.");
  }
  if (typeof raiz.versao !== "number" || raiz.versao > VERSAO_EXPORTACAO) {
    throw new Error("Este arquivo foi exportado por uma versão mais nova do app.");
  }

  const dados = objeto(raiz.webinar, "webinar");
  const config: Record<string, unknown> = {};
  for (const [campo, tipo] of Object.entries(CAMPOS) as [CampoConfig, TipoCampo][]) {
    config[campo] = lerCampo(campo, tipo, campo in dados ? dados[campo] : PADROES[campo]);
  }

  if (!String(config.titulo).trim()) throw erroCampo("titulo");
  if (!incluido(TIPOS_AGENDAMENTO, config.tipoAgendamento)) throw erroCampo("tipoAgendamento");
  if (config.agendadoRepeticao !== null && !incluido(REPETICOES_AGENDADO, config.agendadoRepeticao)) {
    throw erroCampo("agendadoRepeticao");
  }
  if (!incluido(TEMAS_SALA, config.temaSala)) throw erroCampo("temaSala");
  if (!incluido(FONTES_SALA, config.fonteSala)) throw erroCampo("fonteSala");
  for (const campo of ["corPrimaria", "corFundo", "corTexto"]) {
    if (!/^#[0-9a-f]{6}$/i.test(String(config[campo]))) throw erroCampo(campo);
  }

  const mensagensBrutas = raiz.chatMessages ?? [];
  if (!Array.isArray(mensagensBrutas) || mensagensBrutas.length > MAX_MENSAGENS_CHAT) {
    throw new Error("Lista de mensagens do chat inválida.");
  }
  const chatMessages = mensagensBrutas.map((bruta, indice): MensagemChatConfig => {
    const mensagem = objeto(bruta, `chatMessages[${indice}]`);
    if (
      !Number.isInteger(mensagem.timestampSegundos) ||
      typeof mensagem.nomeAutor !== "string" ||
      typeof mensagem.texto !== "string"
    ) {
      throw new Error(`Mensagem ${indice + 1} do chat inválida.`);
    }
    return {
      timestampSegundos: mensagem.timestampSegundos as number,
      nomeAutor: mensagem.nomeAutor,
      avatarUrl: typeof mensagem.avatarUrl === "string" ? mensagem.avatarUrl : null,
      texto: mensagem.texto,
      tipo: parseTipoMensagem(mensagem.tipo),
      ordem: Number.isInteger(mensagem.ordem) ? (mensagem.ordem as number) : indice,
    };
  });

  let transcricao: TranscricaoConfig | null = null;
  if (raiz.transcricao !== undefined && raiz.transcricao !== null) {
    const bruta = objeto(raiz.transcricao, "transcricao");
    if (bruta.formato !== "srt" && bruta.formato !== "vtt") throw new Error("Formato da transcrição inválido.");
    transcricao = {
      segmentos: lerSegmentos(bruta.segmentos),
      formato: bruta.formato,
      nomeArquivo: typeof bruta.nomeArquivo === "string" ? bruta.nomeArquivo : null,
    };
  }

  return {
    config: config as ConfigWebinar,
    chatMessages,
    transcricao,
    slugOriginal: typeof raiz.slugOriginal === "string" ? raiz.slugOriginal : "",
  };
}
