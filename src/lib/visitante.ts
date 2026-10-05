// Id anonimo do visitante, gravado no navegador - usado pela presenca/chat
// (ver useChatAoVivo.ts) e pelo rastreamento de funil (ver funil.ts). Mesma
// chave em todo lugar, pra um visitante carregar a mesma identidade do
// momento que entra na sala ate o clique no CTA.
//
// Guardado em localStorage E em cookie: navegadores embutidos (Instagram,
// Facebook) e modo privado costumam perder um dos dois entre aberturas, e
// sem id estavel a mesma pessoa viraria um visitante novo a cada acesso.
export const CHAVE_VISITANTE = "vw_visitante";

const ID_VALIDO = /^[A-Za-z0-9-]{8,64}$/;
const UM_ANO_EM_SEGUNDOS = 60 * 60 * 24 * 365;

// Um unico id por carregamento de pagina, mesmo se o armazenamento falhar:
// presenca e clique no CTA precisam sair com o mesmo id.
let idEmMemoria: string | null = null;

function lerLocalStorage(): string | null {
  try {
    const valor = localStorage.getItem(CHAVE_VISITANTE);
    return valor && ID_VALIDO.test(valor) ? valor : null;
  } catch {
    return null;
  }
}

function lerCookie(): string | null {
  try {
    const achado = document.cookie.split("; ").find((parte) => parte.startsWith(`${CHAVE_VISITANTE}=`));
    const valor = achado ? decodeURIComponent(achado.slice(CHAVE_VISITANTE.length + 1)) : null;
    return valor && ID_VALIDO.test(valor) ? valor : null;
  } catch {
    return null;
  }
}

function gravar(id: string): void {
  try {
    localStorage.setItem(CHAVE_VISITANTE, id);
  } catch {
    // armazenamento bloqueado: o cookie abaixo ainda segura o id
  }
  try {
    document.cookie = `${CHAVE_VISITANTE}=${encodeURIComponent(id)}; max-age=${UM_ANO_EM_SEGUNDOS}; path=/; SameSite=Lax`;
  } catch {
    // cookies bloqueados: o id fica so em memoria nessa pagina
  }
}

// crypto.randomUUID nao existe em navegadores antigos (iOS < 15.4, WebViews
// antigos de Android e de apps): chama-la sem checar derrubava a sala inteira
// no momento em que ela ia ao vivo.
function gerarId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // cai no proximo metodo
  }
  const bytes = new Uint8Array(16);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function obterVisitanteId(): string {
  if (idEmMemoria) return idEmMemoria;
  const id = lerLocalStorage() ?? lerCookie() ?? gerarId();
  gravar(id);
  idEmMemoria = id;
  return id;
}
