import Anthropic from "@anthropic-ai/sdk";
import { duracaoTranscricao, formatarTempo, type SegmentoTranscricao } from "./legendas";

// Gera o roteiro do chat simulado e detecta o momento do pitch a partir da
// transcricao do video, via API da Anthropic (ANTHROPIC_API_KEY). So roda no
// servidor: importado apenas pelas server actions do editor de chat - no
// client, importe so os tipos.

const MODELO = "claude-opus-5";

export type DensidadeChat = "baixa" | "media" | "alta";

// Media de mensagens por minuto de video. O modelo concentra mais nos picos
// (abertura, pedidos de interacao, pitch) e menos nos trechos expositivos.
const MENSAGENS_POR_MINUTO: Record<DensidadeChat, number> = { baixa: 1, media: 2.5, alta: 5 };

// Teto por geracao: mantem a resposta dentro do maxDuration da pagina do
// chat. Webinars longos em volume alto param aqui.
const MAX_MENSAGENS = 400;

// Legendas do Premiere/YouTube quebram a fala a cada 2-3s. Juntar em blocos
// de ~8s corta bastante token e ainda deixa o tempo do pitch preciso o
// suficiente pro botao da oferta.
const SEGUNDOS_POR_BLOCO = 8;

export type ContextoWebinar = {
  titulo: string;
  ofertaNome: string | null;
  ofertaTitulo: string | null;
  ofertaDescricao: string | null;
  precoOriginal: number | null;
  precoOferta: number | null;
  ctaTexto: string;
};

export type MensagemGerada = {
  timestampSegundos: number;
  nomeAutor: string;
  texto: string;
  tipo: "mensagem" | "sistema";
};

export type PitchDetectado = {
  timestampSegundos: number;
  trechoFalado: string;
  justificativa: string;
};

export type RoteiroGerado = {
  pitch: PitchDetectado | null;
  mensagens: MensagemGerada[];
};

// Erro com mensagem pronta pra mostrar no admin
export class ErroGeracaoRoteiro extends Error {}

const SYSTEM_PROMPT = `Você cria o roteiro do chat simulado de um webinar gravado que é exibido como se estivesse ao vivo, e identifica em que momento do vídeo começa o pitch (a apresentação da oferta paga). Você recebe a transcrição do vídeo com o tempo, em segundos, de cada trecho.

## Momento do pitch
É o segundo em que o apresentador passa do conteúdo para a venda: anuncia o produto ou programa, como participar, bônus ou preço. É nesse momento que o botão de compra aparece na tela, então escolha o início da apresentação da oferta — não uma menção de passagem feita antes, nem o momento em que o preço é revelado se a apresentação já tinha começado. Use o tempo do trecho da transcrição onde essa transição acontece. Se o vídeo não apresenta nenhuma oferta, marque encontrado como false.

## Mensagens do chat
O chat precisa parecer uma plateia real assistindo junto:
- Cada mensagem reage a algo que já foi falado, entre 3 e 25 segundos depois do trecho que a motivou. Nunca antecipe algo que o apresentador ainda não disse: o espectador percebe na hora.
- Quando o apresentador pede interação ("digita 1 no chat", "de onde você está assistindo?", "escreve EU QUERO"), gere uma leva de respostas nos segundos seguintes. São os momentos de maior volume.
- Nos primeiros minutos, cumprimentos e de onde as pessoas estão assistindo. Durante o conteúdo, reações aos pontos fortes, identificação com as dores descritas e perguntas coerentes com o assunto. Depois do pitch, empolgação e dúvidas sobre a oferta.
- Não invente fatos sobre a oferta (preço, bônus, garantia, prazo, parcelamento) que não estejam na transcrição ou nos dados do webinar. Também não escreva depoimentos de resultados específicos (valores, quilos, faturamento) atribuídos aos espectadores.
- Autores com nomes brasileiros variados (primeiro nome, às vezes com sobrenome ou inicial). Alguns autores voltam a comentar ao longo do vídeo, como numa plateia de verdade.
- Escrita de chat: mensagens curtas, às vezes em minúsculas ou com abreviações (vc, tbm, q), emojis com moderação, tom e tamanho variados. Evite mensagens genéricas repetidas.
- Mensagens do tipo "sistema" são avisos da plataforma e devem ser raras (por exemplo, um aviso sobre a oferta logo depois do pitch). Todo o resto é "mensagem".
- Os tempos ficam entre 0 e a duração do vídeo.`;

const SCHEMA_ROTEIRO = {
  type: "object",
  additionalProperties: false,
  required: ["pitch", "mensagens"],
  properties: {
    pitch: {
      type: "object",
      additionalProperties: false,
      required: ["encontrado", "timestampSegundos", "trechoFalado", "justificativa"],
      properties: {
        encontrado: { type: "boolean" },
        timestampSegundos: { type: "integer", description: "Segundo do vídeo em que o pitch começa" },
        trechoFalado: { type: "string", description: "Frase da transcrição onde o pitch começa (até ~25 palavras)" },
        justificativa: { type: "string", description: "Uma frase explicando por que esse é o início do pitch" },
      },
    },
    mensagens: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["timestampSegundos", "nomeAutor", "texto", "tipo"],
        properties: {
          timestampSegundos: { type: "integer" },
          nomeAutor: { type: "string" },
          texto: { type: "string" },
          tipo: { type: "string", enum: ["mensagem", "sistema"] },
        },
      },
    },
  },
};

type RespostaModelo = {
  pitch?: { encontrado?: boolean; timestampSegundos?: number; trechoFalado?: string; justificativa?: string };
  mensagens?: Array<{ timestampSegundos?: number; nomeAutor?: string; texto?: string; tipo?: string }>;
};

function agruparTranscricao(segmentos: SegmentoTranscricao[]): string {
  const linhas: string[] = [];
  let inicioBloco = 0;
  let textos: string[] = [];
  for (const segmento of segmentos) {
    if (textos.length === 0) inicioBloco = segmento.inicio;
    textos.push(segmento.texto);
    if (segmento.fim - inicioBloco >= SEGUNDOS_POR_BLOCO) {
      linhas.push(`[${Math.floor(inicioBloco)}s] ${textos.join(" ")}`);
      textos = [];
    }
  }
  if (textos.length > 0) linhas.push(`[${Math.floor(inicioBloco)}s] ${textos.join(" ")}`);
  return linhas.join("\n");
}

function descreverWebinar(webinar: ContextoWebinar, duracaoSegundos: number): string {
  const linhas = [
    `Título: ${webinar.titulo}`,
    `Duração do vídeo: ${formatarTempo(duracaoSegundos)} (${duracaoSegundos}s)`,
  ];
  if (webinar.ofertaNome) linhas.push(`Produto: ${webinar.ofertaNome}`);
  if (webinar.ofertaTitulo) linhas.push(`Título da oferta: ${webinar.ofertaTitulo}`);
  if (webinar.ofertaDescricao) linhas.push(`Descrição da oferta: ${webinar.ofertaDescricao}`);
  if (webinar.precoOferta != null) {
    linhas.push(
      webinar.precoOriginal != null
        ? `Preço: de ${webinar.precoOriginal} por ${webinar.precoOferta}`
        : `Preço: ${webinar.precoOferta}`,
    );
  }
  linhas.push(`Texto do botão de compra: ${webinar.ctaTexto}`);
  return linhas.join("\n");
}

function inteiroEntre(valor: unknown, minimo: number, maximo: number): number {
  const numero = Math.floor(Number(valor));
  if (!Number.isFinite(numero)) return minimo;
  return Math.min(maximo, Math.max(minimo, numero));
}

function mensagemDeErroDaApi(erro: unknown): string | null {
  if (erro instanceof Anthropic.AuthenticationError) {
    return "A chave da API da Anthropic é inválida. Confira ANTHROPIC_API_KEY.";
  }
  if (erro instanceof Anthropic.RateLimitError) {
    return "Limite de uso da API da Anthropic atingido. Tente de novo em alguns minutos.";
  }
  if (erro instanceof Anthropic.APIError) {
    return `A API da Anthropic retornou um erro (${erro.status ?? "sem conexão"}). Tente de novo.`;
  }
  if (erro instanceof Anthropic.AnthropicError) {
    return "Não foi possível chamar a API da Anthropic. Confira se ANTHROPIC_API_KEY está configurada.";
  }
  return null;
}

async function chamarModelo(transcricao: string, pedido: string) {
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: MODELO,
    // Streaming com teto alto: webinars longos geram respostas grandes e a
    // chamada sem streaming estouraria o timeout HTTP do SDK
    max_tokens: 64000,
    // Se o classificador de seguranca recusar, a API refaz a chamada num
    // modelo alternativo em vez de devolver a recusa
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: SCHEMA_ROTEIRO },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          // Transcricao primeiro e cacheada: gerar de novo com outras
          // instrucoes/volume reaproveita o cache e sai bem mais barato
          { type: "text", text: `<transcricao>\n${transcricao}\n</transcricao>`, cache_control: { type: "ephemeral" } },
          { type: "text", text: pedido },
        ],
      },
    ],
  });
  return stream.finalMessage();
}

export async function gerarRoteiro(params: {
  segmentos: SegmentoTranscricao[];
  webinar: ContextoWebinar;
  densidade: DensidadeChat;
  instrucoes: string;
}): Promise<RoteiroGerado> {
  const { segmentos, webinar, densidade, instrucoes } = params;
  const duracaoSegundos = Math.ceil(duracaoTranscricao(segmentos));
  const quantidadeAlvo = Math.min(
    MAX_MENSAGENS,
    Math.max(10, Math.round((duracaoSegundos / 60) * MENSAGENS_POR_MINUTO[densidade])),
  );

  const pedido = [
    `<webinar>\n${descreverWebinar(webinar, duracaoSegundos)}\n</webinar>`,
    `Gere cerca de ${quantidadeAlvo} mensagens.`,
    instrucoes.trim() ? `<instrucoes_do_produtor>\n${instrucoes.trim()}\n</instrucoes_do_produtor>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const resposta = await chamarModelo(agruparTranscricao(segmentos), pedido).catch((erro: unknown) => {
    const mensagem = mensagemDeErroDaApi(erro);
    if (!mensagem) throw erro;
    console.error("Erro na API da Anthropic ao gerar roteiro", erro);
    throw new ErroGeracaoRoteiro(mensagem);
  });

  if (resposta.stop_reason === "refusal") {
    throw new ErroGeracaoRoteiro("A IA recusou gerar este roteiro. Ajuste as instruções extras e tente de novo.");
  }
  if (resposta.stop_reason === "max_tokens") {
    throw new ErroGeracaoRoteiro("A resposta ficou grande demais e foi cortada. Use um volume de chat menor.");
  }

  // Se houve fallback no meio da resposta, o texto valido e o que vem depois
  // do ultimo bloco "fallback" (antes dele e a saida parcial recusada)
  const inicioValido = resposta.content.findLastIndex((bloco) => bloco.type === "fallback") + 1;
  const texto = resposta.content
    .slice(inicioValido)
    .flatMap((bloco) => (bloco.type === "text" ? [bloco.text] : []))
    .join("");

  let dados: RespostaModelo;
  try {
    dados = JSON.parse(texto) as RespostaModelo;
  } catch {
    throw new ErroGeracaoRoteiro("A IA devolveu uma resposta em formato inesperado. Tente de novo.");
  }

  const mensagens: MensagemGerada[] = (dados.mensagens ?? [])
    .map((mensagem) => ({
      timestampSegundos: inteiroEntre(mensagem.timestampSegundos, 0, duracaoSegundos),
      nomeAutor: String(mensagem.nomeAutor ?? "").trim() || "Anonimo",
      texto: String(mensagem.texto ?? "").trim(),
      tipo: mensagem.tipo === "sistema" ? ("sistema" as const) : ("mensagem" as const),
    }))
    .filter((mensagem) => mensagem.texto.length > 0)
    .sort((a, b) => a.timestampSegundos - b.timestampSegundos);

  const pitch: PitchDetectado | null = dados.pitch?.encontrado
    ? {
        timestampSegundos: inteiroEntre(dados.pitch.timestampSegundos, 0, duracaoSegundos),
        trechoFalado: String(dados.pitch.trechoFalado ?? "").trim(),
        justificativa: String(dados.pitch.justificativa ?? "").trim(),
      }
    : null;

  return { pitch, mensagens };
}
