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

export function obterVisitanteId(): string {
  if (idEmMemoria) return idEmMemoria;
  const id = lerLocalStorage() ?? lerCookie() ?? crypto.randomUUID();
  gravar(id);
  idEmMemoria = id;
  return id;
}
