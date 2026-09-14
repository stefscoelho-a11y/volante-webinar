import ExcelJS from "exceljs";
import { parseTipoMensagem, type MensagemChatImportada, type TipoMensagemChat } from "@/lib/chatMensagens";

/**
 * Roteiro do chat em planilha, no modelo do HotWebinar: Hora / Minuto /
 * Segundo para ser enviado, Nome do participante, Texto enviado e Suporte
 * (preenchido = mensagem do suporte). As colunas sao achadas pelo cabecalho,
 * entao a ordem nao importa. Aceita .xlsx e .csv. So servidor.
 */

/** Erro com mensagem pronta pra mostrar no admin. */
export class ErroPlanilha extends Error {}

const MAX_LINHAS = 5000;
const MAX_TEXTO = 2000;
const MAX_LINHAS_NO_AVISO = 8;

// As 6 primeiras colunas identicas ao modelo do HotWebinar (inclusive o
// parentese que falta no original), mais Tipo pra preservar mensagens de sistema.
const CABECALHOS_EXPORTACAO = [
  "Hora para ser enviado",
  "Minuto para ser enviado",
  "Segundo para ser enviado",
  "Nome do participante",
  "Texto enviado",
  "Suporte(Caso não seja, deixe em branco",
  "Tipo (mensagem, sistema ou suporte)",
];
const LARGURAS_EXPORTACAO = [12, 12, 12, 28, 70, 16, 16];

type Coluna = "hora" | "minuto" | "segundo" | "tempo" | "nome" | "texto" | "suporte" | "tipo";

// A ordem importa: "Tipo (mensagem, sistema ou suporte)" tambem contem
// "mensagem" e "suporte", entao tipo e suporte sao testados antes.
const REGRAS_CABECALHO: [Coluna, (cabecalho: string) => boolean][] = [
  ["tipo", (c) => c.startsWith("tipo")],
  ["suporte", (c) => c.startsWith("suporte")],
  ["hora", (c) => c.startsWith("hora") && !c.startsWith("horario")],
  ["minuto", (c) => c.startsWith("minuto")],
  ["segundo", (c) => c.startsWith("segundo")],
  ["tempo", (c) => ["tempo", "timestamp", "momento", "horario"].some((prefixo) => c.startsWith(prefixo))],
  ["nome", (c) => c.includes("nome") || c.includes("autor") || c.includes("participante")],
  ["texto", (c) => c.includes("texto") || c.includes("mensagem") || c.includes("comentario")],
];

// Na coluna Suporte, qualquer valor diferente destes marca a mensagem como do suporte
const VALORES_FALSOS = new Set(["", "false", "falso", "nao", "n", "no", "0"]);

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function mapearColunas(linha: string[]): Partial<Record<Coluna, number>> {
  const mapa: Partial<Record<Coluna, number>> = {};
  linha.forEach((celula, indice) => {
    const cabecalho = normalizar(celula ?? "");
    if (!cabecalho) return;
    const regra = REGRAS_CABECALHO.find(([coluna, bate]) => mapa[coluna] === undefined && bate(cabecalho));
    if (regra) mapa[regra[0]] = indice;
  });
  return mapa;
}

function temColunasHoraMinutoSegundo(mapa: Partial<Record<Coluna, number>>): boolean {
  return mapa.hora !== undefined || mapa.minuto !== undefined || mapa.segundo !== undefined;
}

function lerInteiro(valor: string): number | null {
  if (!valor) return 0;
  return /^\d+$/.test(valor) ? Number(valor) : null;
}

/** "HH:MM:SS", "MM:SS" ou so segundos. */
function lerTempo(valor: string): number | null {
  const partes = valor.split(":").map((parte) => parte.trim());
  if (!valor || partes.length > 3 || partes.some((parte) => !/^\d+$/.test(parte))) return null;
  return partes.reduce((total, parte) => total * 60 + Number(parte), 0);
}

/** Linhas cruas (a primeira da planilha e a linha 1) -> mensagens ordenadas por tempo + avisos. */
export function interpretarLinhas(linhas: string[][]): { mensagens: MensagemChatImportada[]; avisos: string[] } {
  const indiceCabecalho = linhas.slice(0, 10).findIndex((linha) => {
    const mapa = mapearColunas(linha);
    return mapa.texto !== undefined && (temColunasHoraMinutoSegundo(mapa) || mapa.tempo !== undefined);
  });
  if (indiceCabecalho === -1) {
    throw new ErroPlanilha(
      'Não encontrei o cabeçalho. A planilha precisa das colunas "Hora", "Minuto" e "Segundo para ser enviado" e "Texto enviado".',
    );
  }

  const mapa = mapearColunas(linhas[indiceCabecalho]);
  const dados = linhas.slice(indiceCabecalho + 1);
  if (dados.length > MAX_LINHAS) throw new ErroPlanilha(`A planilha passa do limite de ${MAX_LINHAS} linhas.`);

  const celula = (linha: string[], coluna: Coluna) => {
    const indice = mapa[coluna];
    return indice === undefined ? "" : (linha[indice] ?? "").trim();
  };

  const mensagens: (MensagemChatImportada & { linha: number })[] = [];
  const problemas: string[] = [];

  dados.forEach((linha, posicao) => {
    const numeroLinha = indiceCabecalho + posicao + 2;
    if (linha.every((valor) => !valor?.trim())) return;

    const texto = celula(linha, "texto").slice(0, MAX_TEXTO);
    if (!texto) {
      problemas.push(`linha ${numeroLinha} sem texto`);
      return;
    }

    let timestampSegundos: number | null;
    if (temColunasHoraMinutoSegundo(mapa)) {
      const [horas, minutos, segundos] = (["hora", "minuto", "segundo"] as const).map((coluna) =>
        lerInteiro(celula(linha, coluna)),
      );
      timestampSegundos =
        horas === null || minutos === null || segundos === null || minutos > 59 || segundos > 59
          ? null
          : horas * 3600 + minutos * 60 + segundos;
    } else {
      timestampSegundos = lerTempo(celula(linha, "tempo"));
    }
    if (timestampSegundos === null) {
      problemas.push(`linha ${numeroLinha} com tempo inválido`);
      return;
    }

    const suporte = !VALORES_FALSOS.has(normalizar(celula(linha, "suporte")));
    const tipoInformado = normalizar(celula(linha, "tipo"));
    const tipo: TipoMensagemChat = suporte ? "suporte" : tipoInformado ? parseTipoMensagem(tipoInformado) : "mensagem";

    mensagens.push({
      linha: numeroLinha,
      timestampSegundos,
      nomeAutor: celula(linha, "nome") || (tipo === "suporte" ? "Suporte" : "Anônimo"),
      texto,
      tipo,
    });
  });

  if (mensagens.length === 0) {
    throw new ErroPlanilha(
      problemas.length > 0
        ? `Nenhuma mensagem válida na planilha (${problemas.slice(0, 3).join(", ")}).`
        : "A planilha não tem mensagens.",
    );
  }

  // Planilhas costumam vir fora de ordem; empate de tempo mantem a ordem das linhas
  mensagens.sort((a, b) => a.timestampSegundos - b.timestampSegundos || a.linha - b.linha);

  const avisos: string[] = [];
  if (problemas.length > 0) {
    const resto = problemas.length > MAX_LINHAS_NO_AVISO ? ` e mais ${problemas.length - MAX_LINHAS_NO_AVISO}` : "";
    avisos.push(
      `${problemas.length} linha${problemas.length === 1 ? "" : "s"} ignorada${problemas.length === 1 ? "" : "s"}: ${problemas
        .slice(0, MAX_LINHAS_NO_AVISO)
        .join(", ")}${resto}.`,
    );
  }

  return {
    mensagens: mensagens.map(({ timestampSegundos, nomeAutor, texto, tipo }) => ({ timestampSegundos, nomeAutor, texto, tipo })),
    avisos,
  };
}

function textoDaCelula(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) {
    // Celula formatada como hora: o Excel guarda 01:11:05 como data de 1899
    return [valor.getUTCHours(), valor.getUTCMinutes(), valor.getUTCSeconds()]
      .map((parte) => String(parte).padStart(2, "0"))
      .join(":");
  }
  if (typeof valor === "object") {
    if ("richText" in valor) return valor.richText.map((parte) => parte.text).join("");
    if ("text" in valor) return String(valor.text);
    if ("result" in valor) return valor.result === undefined ? "" : textoDaCelula(valor.result as ExcelJS.CellValue);
    return "";
  }
  return String(valor);
}

async function linhasDoXlsx(conteudo: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(conteudo as unknown as ArrayBuffer);
  } catch {
    throw new ErroPlanilha("Não consegui abrir o arquivo .xlsx. Confira se ele não está corrompido.");
  }

  const planilha = workbook.worksheets[0];
  if (!planilha || planilha.rowCount === 0) throw new ErroPlanilha("A planilha está vazia.");
  if (planilha.rowCount > MAX_LINHAS + 10) throw new ErroPlanilha(`A planilha passa do limite de ${MAX_LINHAS} linhas.`);

  const linhas: string[][] = [];
  for (let numero = 1; numero <= planilha.rowCount; numero++) {
    const linha = planilha.getRow(numero);
    const celulas: string[] = [];
    for (let coluna = 1; coluna <= planilha.columnCount; coluna++) {
      celulas.push(textoDaCelula(linha.getCell(coluna).value));
    }
    linhas.push(celulas);
  }
  return linhas;
}

function decodificarTexto(conteudo: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(conteudo);
  } catch {
    // CSV salvo pelo Excel em portugues costuma vir em Windows-1252
    return new TextDecoder("windows-1252").decode(conteudo);
  }
}

function linhasDoCsv(texto: string): string[][] {
  const conteudo = texto.replace(/^﻿/, "");
  const primeiraLinha = conteudo.split(/\r?\n/, 1)[0] ?? "";
  const separador = [",", "\t"].reduce(
    (melhor, candidato) => (primeiraLinha.split(candidato).length > primeiraLinha.split(melhor).length ? candidato : melhor),
    ";",
  );

  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = "";
  let entreAspas = false;
  for (let i = 0; i < conteudo.length; i++) {
    const caractere = conteudo[i];
    if (entreAspas) {
      if (caractere !== '"') campo += caractere;
      else if (conteudo[i + 1] === '"') {
        campo += '"';
        i++;
      } else entreAspas = false;
    } else if (caractere === '"') {
      entreAspas = true;
    } else if (caractere === separador) {
      linha.push(campo);
      campo = "";
    } else if (caractere === "\n" || caractere === "\r") {
      if (caractere === "\r" && conteudo[i + 1] === "\n") i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += caractere;
    }
  }
  if (campo || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas;
}

export async function lerPlanilhaChat(
  nomeArquivo: string,
  conteudo: Buffer,
): Promise<{ mensagens: MensagemChatImportada[]; avisos: string[] }> {
  const extensao = nomeArquivo.toLowerCase().split(".").pop() ?? "";
  // .xlsx e um zip: comeca com "PK"
  const ehXlsx = conteudo[0] === 0x50 && conteudo[1] === 0x4b;
  if (!ehXlsx && extensao === "xls") {
    throw new ErroPlanilha("Arquivos .xls antigos não são aceitos. Salve a planilha como .xlsx ou .csv.");
  }
  if (!ehXlsx && extensao !== "csv" && extensao !== "txt") {
    throw new ErroPlanilha("Envie uma planilha .xlsx ou .csv.");
  }
  const linhas = ehXlsx ? await linhasDoXlsx(conteudo) : linhasDoCsv(decodificarTexto(conteudo));
  return interpretarLinhas(linhas);
}

export async function gerarPlanilhaChat(
  mensagens: { timestampSegundos: number; nomeAutor: string; texto: string; tipo: string }[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const planilha = workbook.addWorksheet("Planilha 1", { views: [{ state: "frozen", ySplit: 1 }] });
  planilha.columns = LARGURAS_EXPORTACAO.map((width) => ({ width }));
  planilha.addRow(CABECALHOS_EXPORTACAO).font = { bold: true };

  const doisDigitos = (valor: number) => String(valor).padStart(2, "0");
  for (const mensagem of mensagens) {
    const total = Math.max(0, Math.floor(mensagem.timestampSegundos));
    const tipo = parseTipoMensagem(mensagem.tipo);
    planilha.addRow([
      doisDigitos(Math.floor(total / 3600)),
      doisDigitos(Math.floor((total % 3600) / 60)),
      doisDigitos(total % 60),
      mensagem.nomeAutor,
      mensagem.texto,
      tipo === "suporte" ? "true" : "",
      tipo,
    ]);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
