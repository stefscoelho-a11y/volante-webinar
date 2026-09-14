// Tipos de mensagem do chat fake. Pode ser importado no servidor e no navegador.

export const TIPOS_MENSAGEM_CHAT = ["mensagem", "sistema", "suporte"] as const;
export type TipoMensagemChat = (typeof TIPOS_MENSAGEM_CHAT)[number];

export type MensagemChatImportada = {
  timestampSegundos: number;
  nomeAutor: string;
  texto: string;
  tipo: TipoMensagemChat;
};

export function parseTipoMensagem(valor: unknown): TipoMensagemChat {
  return TIPOS_MENSAGEM_CHAT.includes(valor as TipoMensagemChat) ? (valor as TipoMensagemChat) : "mensagem";
}

export type TrechoTexto = { link: boolean; texto: string };

const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

/**
 * Separa texto e links http(s) pra renderizar links clicaveis sem HTML cru
 * (usado nas mensagens do suporte). Pontuacao colada no fim do link fica
 * de fora dele.
 */
export function dividirLinks(texto: string): TrechoTexto[] {
  const trechos: TrechoTexto[] = [];
  let fimAnterior = 0;
  for (const match of texto.matchAll(URL_REGEX)) {
    const pontuacaoFinal = /[.,;:!?)\]]+$/.exec(match[0])?.[0] ?? "";
    const url = match[0].slice(0, match[0].length - pontuacaoFinal.length);
    if (match.index > fimAnterior) trechos.push({ link: false, texto: texto.slice(fimAnterior, match.index) });
    trechos.push({ link: true, texto: url });
    fimAnterior = match.index + url.length;
  }
  if (fimAnterior < texto.length) trechos.push({ link: false, texto: texto.slice(fimAnterior) });
  return trechos;
}
