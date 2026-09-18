import Anthropic from "@anthropic-ai/sdk";
import type { CamposOferta } from "@/lib/canaisOferta";

/**
 * Agente de suporte ao vivo da sala: responde duvidas de quem esta assistindo
 * e, a partir do pitch, ajuda a vender. Comportamento fixo (o mesmo prompt
 * pra qualquer webinario) - o que muda de webinario pra webinario e o
 * CONTEXTO configurado no admin (ver etapa "Agente IA"). So roda no
 * servidor: importado apenas pela server action em src/app/[slug]/actions.ts.
 */

// Rapido e barato: e um chat ao vivo (a pessoa esta esperando a resposta na
// tela), nao uma geracao em lote como o roteiro do chat fake.
const MODELO = "claude-haiku-4-5-20251001";

const MAX_HISTORICO = 12;
export const MAX_TEXTO_MENSAGEM = 500;

export type MensagemAgente = { autor: "visitante" | "agente"; texto: string };

export type ConfigAgente = {
  nome: string | null;
  informacoesProduto: string | null;
  tom: string | null;
  roteiroAula: string | null;
};

const SYSTEM_PROMPT = `Você é a pessoa de suporte ao vivo de uma sala de webinar (uma aula gravada exibida para o espectador como se estivesse ao vivo). Você conversa pelo chat flutuante de suporte com quem está assistindo agora. Seu nome de exibição e o tom de voz vêm no contexto - incorpore esse tom em tudo que escrever.

## Como se comportar
- Português do Brasil, mensagens curtas de chat (1 a 3 frases), nunca um texto longo tipo e-mail.
- Aja como uma pessoa de verdade da equipe, com o nome informado no contexto. Não se identifique como IA/robô a menos que perguntem diretamente - nesse caso, seja honesto.
- Antes do pitch (contexto abaixo dirá se já passou): foque em tirar dúvidas sobre o conteúdo da aula (use o roteiro da aula, se fornecido) e incentivar a pessoa a continuar assistindo. Não fale da oferta paga antes da hora, mesmo se perguntarem - diga que a apresentação completa vem em breve na própria aula.
- Depois do pitch: você pode falar sobre a oferta e usar as informações extras do produto pra responder objeções comuns (preço, funciona pra mim?, tenho tempo?). O objetivo é vender de forma sugestiva e consultiva, nunca insistente ou pressionando - conduza a pessoa a decidir, sem empurrar.
- Só afirme fatos sobre a oferta (nome, preço, condições, bônus, garantia, link) que estejam explicitamente no contexto abaixo. Nunca invente nada que não foi passado - se não souber, diga que vai confirmar e direcione pro que você sabe.
- Pergunta fora do tema do webinar (pessoal, spam, ofensiva): redirecione educadamente de volta pro webinar, sem ser seco.
- Nunca invente um link diferente do informado no contexto.`;

function descreverOferta(oferta: CamposOferta): string {
  const linhas: string[] = [];
  if (oferta.ofertaNome) linhas.push(`Nome da oferta: ${oferta.ofertaNome}`);
  if (oferta.ofertaTitulo) linhas.push(`Título: ${oferta.ofertaTitulo}`);
  if (oferta.ofertaDescricao) linhas.push(`Descrição/urgência: ${oferta.ofertaDescricao}`);
  if (oferta.precoOferta != null) {
    linhas.push(
      oferta.precoOriginal != null
        ? `Preço: de R$${oferta.precoOriginal} por R$${oferta.precoOferta}`
        : `Preço: R$${oferta.precoOferta}`,
    );
  }
  if (oferta.precoParcelado) linhas.push(`Parcelamento: ${oferta.precoParcelado}`);
  linhas.push(`Texto do botão de compra: ${oferta.ctaTexto}`);
  linhas.push(`Link de compra: ${oferta.ctaLink}`);
  return linhas.length > 0 ? linhas.join("\n") : "Nenhuma oferta configurada ainda.";
}

function montarContexto(
  tituloWebinar: string,
  oferta: CamposOferta,
  config: ConfigAgente,
  jaPassouPitch: boolean,
): string {
  const blocos = [
    `Título do webinar: ${tituloWebinar}`,
    `Seu nome de exibição: ${config.nome?.trim() || "Suporte"}`,
    `O pitch (apresentação da oferta) ${jaPassouPitch ? "já aconteceu" : "ainda não aconteceu"} no vídeo.`,
    `<oferta>\n${descreverOferta(oferta)}\n</oferta>`,
  ];
  if (config.tom?.trim()) blocos.push(`<tom_de_conversa>\n${config.tom.trim()}\n</tom_de_conversa>`);
  if (config.informacoesProduto?.trim()) {
    blocos.push(`<informacoes_extras_do_produto>\n${config.informacoesProduto.trim()}\n</informacoes_extras_do_produto>`);
  }
  if (config.roteiroAula?.trim()) {
    blocos.push(`<roteiro_da_aula>\n${config.roteiroAula.trim()}\n</roteiro_da_aula>`);
  }
  return blocos.join("\n\n");
}

function mensagemDeErroDaApi(erro: unknown): string | null {
  if (erro instanceof Anthropic.AuthenticationError) return "A chave da API da Anthropic é inválida.";
  if (erro instanceof Anthropic.RateLimitError) return "Limite de uso da API da Anthropic atingido. Tente de novo em instantes.";
  if (erro instanceof Anthropic.APIError) return `A API da Anthropic retornou um erro (${erro.status ?? "sem conexão"}).`;
  if (erro instanceof Anthropic.AnthropicError) return "Não foi possível chamar a API da Anthropic.";
  return null;
}

export class ErroAgenteSuporte extends Error {}

async function chamar(contexto: string, historico: MensagemAgente[]): Promise<string> {
  const client = new Anthropic();
  const mensagensHistorico = historico.slice(-MAX_HISTORICO).map((mensagem) => ({
    role: (mensagem.autor === "visitante" ? "user" : "assistant") as "user" | "assistant",
    content: mensagem.texto,
  }));

  let resposta;
  try {
    resposta = await client.messages.create({
      model: MODELO,
      max_tokens: 300,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        { role: "user", content: `<contexto_do_webinar>\n${contexto}\n</contexto_do_webinar>` },
        { role: "assistant", content: "Entendido, estou pronto pra conversar no chat de suporte." },
        ...mensagensHistorico,
      ],
    });
  } catch (erro) {
    const mensagem = mensagemDeErroDaApi(erro);
    if (!mensagem) throw erro;
    console.error("Erro na API da Anthropic no agente de suporte", erro);
    throw new ErroAgenteSuporte(mensagem);
  }

  const texto = resposta.content
    .flatMap((bloco) => (bloco.type === "text" ? [bloco.text] : []))
    .join("")
    .trim();

  if (!texto) throw new ErroAgenteSuporte("A IA não devolveu uma resposta.");
  return texto;
}

/** Resposta a uma pergunta (ou mensagem) do visitante, com o historico da conversa ate agora. */
export async function responderVisitante(
  tituloWebinar: string,
  oferta: CamposOferta,
  config: ConfigAgente,
  jaPassouPitch: boolean,
  historico: MensagemAgente[],
): Promise<string> {
  const contexto = montarContexto(tituloWebinar, oferta, config, jaPassouPitch);
  return chamar(contexto, historico);
}

/** Mensagem proativa unica quando o video chega no momento do pitch - "aborda" quem esta assistindo. */
export async function gerarAbordagemPitch(
  tituloWebinar: string,
  oferta: CamposOferta,
  config: ConfigAgente,
): Promise<string> {
  const contexto = montarContexto(tituloWebinar, oferta, config, true);
  const pedido: MensagemAgente[] = [
    {
      autor: "visitante",
      texto:
        "[instrução interna, não é uma mensagem do visitante: a apresentação da oferta acabou de começar. Mande a primeira mensagem proativa puxando conversa, convidando a pessoa a tirar dúvidas sobre a oferta que acabou de aparecer. Não cumprimente como se fosse o início da conversa.]",
    },
  ];
  return chamar(contexto, pedido);
}
