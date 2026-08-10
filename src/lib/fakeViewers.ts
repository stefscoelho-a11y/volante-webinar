/**
 * Contador de "espectadores" fake. Precisa parecer organico (sobe e desce
 * sutilmente) mas ser DETERMINISTICO: mesmo webinar + mesmo ponto do video
 * (elapsedSeconds) sempre gera o mesmo numero, senao ele "pularia" de forma
 * estranha a cada reload ou re-render.
 */

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// PRNG simples e determinístico (mulberry32), só pra gerar o "ruido" a
// partir de uma seed numerica - nao precisa ser criptograficamente forte.
function seededValue(seed: number): number {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const FAIXA_PADRAO_MIN = 60;
const FAIXA_PADRAO_MAX = 240;

export function getFakeViewerCount(
  webinarId: string,
  elapsedSeconds: number,
  minConfigurado?: number | null,
  maxConfigurado?: number | null,
): number {
  const temFaixaConfigurada = minConfigurado != null && maxConfigurado != null && maxConfigurado > minConfigurado;
  const min = temFaixaConfigurada ? minConfigurado! : FAIXA_PADRAO_MIN;
  const max = temFaixaConfigurada ? maxConfigurado! : FAIXA_PADRAO_MAX;

  const seed = hashString(webinarId);
  const meio = (min + max) / 2;
  const amplitude = (max - min) / 2;

  const wobble = Math.sin(elapsedSeconds / 25 + (seed % 100)) * amplitude * 0.6;
  // Muda a cada 5s (nao a cada frame), pra parecer flutuacao organica e nao
  // ruido visual constante.
  const bucket = Math.floor(Math.max(0, elapsedSeconds) / 5);
  const noise = (seededValue(seed + bucket) - 0.5) * amplitude * 0.4;

  const valor = meio + wobble + noise;
  return Math.max(min, Math.min(max, Math.round(valor)));
}
