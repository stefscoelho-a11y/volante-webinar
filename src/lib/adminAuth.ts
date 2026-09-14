import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "@/proxy";

/**
 * Confere o login do admin dentro de server actions e rotas. O proxy so
 * protege os caminhos /admin, mas uma server action pode ser chamada de
 * qualquer caminho - entao a checagem precisa estar na propria action.
 */
export async function exigirAdmin(): Promise<void> {
  const senha = process.env.ADMIN_PASSWORD;
  const cookie = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!senha || cookie !== senha) throw new Error("Não autorizado.");
}
