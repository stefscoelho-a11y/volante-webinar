import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hash de senha com scrypt (nativo do Node, sem dependencia extra - evita o
 * problema recorrente de binarios nativos quebrando o build na Vercel).
 * Formato salvo: "<salt hex>:<hash hex>".
 */

const KEYLEN = 64;

export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarSenha(senha: string, armazenada: string): boolean {
  const [salt, hashHex] = armazenada.split(":");
  if (!salt || !hashHex) return false;

  const hashArmazenado = Buffer.from(hashHex, "hex");
  const hashTentativa = scryptSync(senha, salt, KEYLEN);
  if (hashTentativa.length !== hashArmazenado.length) return false;

  return timingSafeEqual(hashTentativa, hashArmazenado);
}
