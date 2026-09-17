import { prisma } from "@/lib/prisma";

/**
 * Retencao real dos videos via YouTube Analytics API. A autorizacao e OAuth
 * por CANAL (nao por video nem por webinar): conecta uma vez, e a partir dai
 * qualquer webinario cujo video seja desse canal consegue puxar a curva de
 * retencao de verdade em vez do grafico ilustrativo.
 *
 * Documentacao: https://developers.google.com/youtube/analytics
 */

const ESCOPO = "https://www.googleapis.com/auth/yt-analytics.readonly";

// Precisa bater exatamente com o URI cadastrado no Google Cloud (Clientes OAuth).
export const YOUTUBE_REDIRECT_URI = "https://volante-webinar.vercel.app/admin/youtube/callback";

function credenciaisConfiguradas(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function youtubeIntegracaoDisponivel(): boolean {
  return credenciaisConfiguradas() !== null;
}

/** URL pra onde o botao "Conectar YouTube" manda o admin - a Google devolve um `code` no redirect_uri configurado. */
export function urlAutorizacaoYoutube(): string | null {
  const credenciais = credenciaisConfiguradas();
  if (!credenciais) return null;

  const params = new URLSearchParams({
    client_id: credenciais.clientId,
    redirect_uri: YOUTUBE_REDIRECT_URI,
    response_type: "code",
    scope: ESCOPO,
    access_type: "offline",
    // Forca a tela de consentimento de novo pra garantir que a Google devolva
    // um refresh_token mesmo se essa conta ja tiver autorizado antes.
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokensGoogle = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
};

/** Troca o `code` do redirect (primeira autorizacao) por access_token + refresh_token. */
export async function trocarCodigoPorTokens(code: string): Promise<{ accessToken: string; refreshToken: string | null }> {
  const credenciais = credenciaisConfiguradas();
  if (!credenciais) throw new Error("Integração com o YouTube não configurada (faltam as credenciais OAuth).");

  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: credenciais.clientId,
      client_secret: credenciais.clientSecret,
      redirect_uri: YOUTUBE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao trocar o código de autorização pelo token (${resposta.status}): ${await resposta.text()}`);
  }

  const dados = (await resposta.json()) as TokensGoogle;
  return { accessToken: dados.access_token, refreshToken: dados.refresh_token ?? null };
}

/** Pega um access_token novo a partir do refresh_token guardado (o refresh_token nao expira, so o access_token). */
async function renovarAccessToken(refreshToken: string): Promise<string> {
  const credenciais = credenciaisConfiguradas();
  if (!credenciais) throw new Error("Integração com o YouTube não configurada (faltam as credenciais OAuth).");

  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: credenciais.clientId,
      client_secret: credenciais.clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Falha ao renovar o acesso ao YouTube (${resposta.status}): ${await resposta.text()}`);
  }

  const dados = (await resposta.json()) as TokensGoogle;
  return dados.access_token;
}

/** Nome/id do canal autenticado pelo access_token - usado so pra mostrar "Conectado como: X" e confirmar o dono do token. */
export async function buscarCanalConectado(accessToken: string): Promise<{ id: string; nome: string } | null> {
  const resposta = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resposta.ok) return null;
  const dados = await resposta.json();
  const canal = dados.items?.[0];
  return canal ? { id: canal.id as string, nome: canal.snippet?.title ?? "Canal do YouTube" } : null;
}

export async function salvarConexao(refreshToken: string, canal: { id: string; nome: string } | null): Promise<void> {
  await prisma.integracaoYoutube.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", refreshToken, canalId: canal?.id, canalNome: canal?.nome },
    update: { refreshToken, canalId: canal?.id, canalNome: canal?.nome },
  });
}

export async function desconectarYoutube(): Promise<void> {
  await prisma.integracaoYoutube.deleteMany({ where: { id: "singleton" } });
}

export type ConexaoYoutube = { canalId: string | null; canalNome: string | null; conectadoEm: Date };

export async function getConexaoAtiva(): Promise<ConexaoYoutube | null> {
  const conexao = await prisma.integracaoYoutube.findUnique({ where: { id: "singleton" } });
  return conexao ? { canalId: conexao.canalId, canalNome: conexao.canalNome, conectadoEm: conexao.conectadoEm } : null;
}

/** Access token valido pra chamar a Analytics API agora, renovando a partir do refresh_token guardado. Null se nunca conectou. */
async function getAccessTokenValido(): Promise<string | null> {
  const conexao = await prisma.integracaoYoutube.findUnique({ where: { id: "singleton" } });
  if (!conexao) return null;
  return renovarAccessToken(conexao.refreshToken);
}

export type PontoRetencao = { elapsedVideoTimeRatio: number; audienceWatchRatio: number };

export type RetencaoVideoResultado =
  | { status: "nao_conectado" }
  | { status: "erro"; mensagem: string }
  | { status: "ok"; pontos: PontoRetencao[] };

/**
 * Curva de retencao real do video (% de audiencia restante a cada ponto do
 * video, 0 a 1). So funciona pra videos do canal conectado - videos de outro
 * canal (ou privados) voltam com status "erro".
 */
export async function buscarRetencaoVideo(videoId: string): Promise<RetencaoVideoResultado> {
  let accessToken: string | null;
  try {
    accessToken = await getAccessTokenValido();
  } catch (erro) {
    return { status: "erro", mensagem: erro instanceof Error ? erro.message : "Falha ao renovar o acesso ao YouTube." };
  }
  if (!accessToken) return { status: "nao_conectado" };

  const params = new URLSearchParams({
    ids: "channel==MINE",
    startDate: "2005-01-01",
    endDate: new Date().toISOString().slice(0, 10),
    metrics: "audienceWatchRatio",
    dimensions: "elapsedVideoTimeRatio",
    filters: `video==${videoId}`,
  });

  const resposta = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resposta.ok) {
    if (resposta.status === 403 || resposta.status === 400) {
      return { status: "erro", mensagem: "Esse vídeo não pertence ao canal conectado, ou não tem dados de retenção ainda." };
    }
    return { status: "erro", mensagem: `A YouTube Analytics API retornou um erro (${resposta.status}).` };
  }

  const dados = await resposta.json();
  const linhas: [number, number][] = dados.rows ?? [];
  if (linhas.length === 0) {
    return { status: "erro", mensagem: "Sem dados de retenção pra esse vídeo ainda (pode levar algumas horas depois de publicado)." };
  }

  const pontos = linhas
    .map(([elapsedVideoTimeRatio, audienceWatchRatio]) => ({ elapsedVideoTimeRatio, audienceWatchRatio }))
    .sort((a, b) => a.elapsedVideoTimeRatio - b.elapsedVideoTimeRatio);

  return { status: "ok", pontos };
}
