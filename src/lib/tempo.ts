// Tempos do video digitados no admin como hh:mm:ss (tambem aceita mm:ss ou so
// segundos). No banco tudo continua em segundos.

/** "01:02:03", "2:03" ou "123" -> segundos. Null se invalido. */
export function parseTempoHMS(valor: string): number | null {
  const texto = valor.trim();
  if (!texto) return null;
  const partes = texto.split(":");
  if (partes.length > 3 || partes.some((parte) => !/^\d+$/.test(parte))) return null;
  const numeros = partes.map(Number);
  // Com dois pontos, minutos e segundos vao ate 59
  if (numeros.slice(1).some((numero) => numero > 59)) return null;
  return numeros.reduce((total, numero) => total * 60 + numero, 0);
}

export function formatarTempoHMS(totalSegundos: number): string {
  const total = Math.max(0, Math.floor(totalSegundos));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((parte) => String(parte).padStart(2, "0"))
    .join(":");
}
