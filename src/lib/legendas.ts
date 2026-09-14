// Parser de legendas (.srt / .vtt) -> trechos de fala com tempo. Serve de
// transcricao do video pra gerar o roteiro do chat com IA.

export type SegmentoTranscricao = {
  inicio: number;
  fim: number;
  texto: string;
};

export type FormatoLegenda = "srt" | "vtt";

// Aceita "HH:MM:SS,mmm" (SRT), "HH:MM:SS.mmm" e "MM:SS.mmm" (VTT)
const TEMPO_REGEX = /(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{1,3})/;

const ENTIDADES_HTML: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

function tempoParaSegundos(valor: string): number | null {
  const match = TEMPO_REGEX.exec(valor);
  if (!match) return null;
  const [, horas, minutos, segundos, milissegundos] = match;
  return (
    Number(horas ?? 0) * 3600 + Number(minutos) * 60 + Number(segundos) + Number(milissegundos.padEnd(3, "0")) / 1000
  );
}

function limparTexto(linha: string): string {
  return (
    linha
      // Tags de formatacao: <i>, <font>, <c> e os tempos por palavra do YouTube (<00:00:01.000>)
      .replace(/<[^>]*>/g, "")
      // Tags de posicionamento estilo ASS que alguns editores exportam no SRT: {\an8}
      .replace(/\{[^}]*\}/g, "")
      .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entidade) => ENTIDADES_HTML[entidade] ?? entidade)
      .replace(/\s+/g, " ")
      .trim()
  );
}

function arredondar(segundos: number): number {
  return Math.round(segundos * 100) / 100;
}

export function detectarFormato(nomeArquivo: string, conteudo: string): FormatoLegenda | null {
  if (/^\uFEFF?WEBVTT/.test(conteudo)) return "vtt";
  const extensao = nomeArquivo.toLowerCase().split(".").pop();
  if (extensao === "vtt" || extensao === "srt") return extensao;
  return null;
}

export function parseLegenda(conteudo: string): SegmentoTranscricao[] {
  const linhas = conteudo.replace(/^\uFEFF/, "").split(/\r\n|\r|\n/);
  const indicesTempo = linhas.flatMap((linha, indice) => (linha.includes("-->") ? [indice] : []));

  const brutos: SegmentoTranscricao[] = [];
  indicesTempo.forEach((indice, posicao) => {
    const [inicioBruto, fimBruto] = linhas[indice].split("-->");
    const inicio = tempoParaSegundos(inicioBruto);
    const fim = tempoParaSegundos(fimBruto ?? "");
    if (inicio === null || fim === null) return;

    // O texto vai ate a proxima linha de tempo. Nao da pra usar "linha em
    // branco fecha o bloco": as legendas automaticas do YouTube comecam o
    // bloco com uma linha so com espaco. O identificador do proximo bloco
    // (numero no SRT, id opcional no VTT) fica logo antes da linha de tempo,
    // depois de uma linha em branco - esse descartamos.
    const temProximo = posicao + 1 < indicesTempo.length;
    const proximo = temProximo ? indicesTempo[posicao + 1] : linhas.length;
    const ultimaLinhaEhIdentificador =
      temProximo && proximo - 2 > indice && linhas[proximo - 1].trim() !== "" && linhas[proximo - 2].trim() === "";
    const fimTexto = ultimaLinhaEhIdentificador ? proximo - 1 : proximo;

    const texto = linhas
      .slice(indice + 1, fimTexto)
      .map(limparTexto)
      .filter(Boolean)
      .join(" ");
    brutos.push({ inicio, fim, texto });
  });

  brutos.sort((a, b) => a.inicio - b.inicio);

  // Legendas automaticas do YouTube repetem a linha anterior em cada bloco
  // ("rolling captions"). Tiramos o prefixo repetido e juntamos blocos
  // identicos consecutivos pra fala nao aparecer duplicada.
  const segmentos: SegmentoTranscricao[] = [];
  for (const bruto of brutos) {
    const anterior = segmentos.at(-1);
    let texto = bruto.texto;
    if (anterior && texto === anterior.texto) {
      anterior.fim = arredondar(Math.max(anterior.fim, bruto.fim));
      continue;
    }
    if (anterior && texto.startsWith(`${anterior.texto} `)) {
      texto = texto.slice(anterior.texto.length + 1);
    }
    if (!texto) continue;
    segmentos.push({ inicio: arredondar(bruto.inicio), fim: arredondar(bruto.fim), texto });
  }
  return segmentos;
}

// A coluna Json do Prisma nao tem tipo: valida o formato ao ler do banco
export function lerSegmentos(valor: unknown): SegmentoTranscricao[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is SegmentoTranscricao => {
    const segmento = item as Partial<SegmentoTranscricao> | null;
    return (
      typeof segmento?.inicio === "number" && typeof segmento.fim === "number" && typeof segmento.texto === "string"
    );
  });
}

export function duracaoTranscricao(segmentos: SegmentoTranscricao[]): number {
  return segmentos.reduce((maior, segmento) => Math.max(maior, segmento.fim), 0);
}

export function formatarTempo(totalSegundos: number): string {
  const total = Math.max(0, Math.floor(totalSegundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  const minutosSegundos = `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
  return horas > 0 ? `${horas}:${minutosSegundos}` : minutosSegundos;
}
