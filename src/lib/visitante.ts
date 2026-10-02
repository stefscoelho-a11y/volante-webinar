// Id anonimo do visitante, gravado no navegador - usado pela presenca/chat
// (ver useChatAoVivo.ts) e pelo rastreamento de funil (ver funil.ts). Mesma
// chave em todo lugar, pra um visitante carregar a mesma identidade do
// momento que entra na sala ate o clique no CTA.
export const CHAVE_VISITANTE = "vw_visitante";

export function obterVisitanteId(): string {
  try {
    const salvo = localStorage.getItem(CHAVE_VISITANTE);
    if (salvo) return salvo;
    const novo = crypto.randomUUID();
    localStorage.setItem(CHAVE_VISITANTE, novo);
    return novo;
  } catch {
    return crypto.randomUUID();
  }
}
