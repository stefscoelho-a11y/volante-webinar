import { execSync } from "node:child_process";

// No deploy de producao da Vercel, aplica as migrations pendentes antes do
// build. Se a migration falhar, o build falha e a versao anterior continua no
// ar. Previews e builds locais nunca mexem no banco.
if (process.env.VERCEL_ENV === "production") {
  execSync("prisma migrate deploy", { stdio: "inherit" });
}

execSync("next build", { stdio: "inherit" });
