import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Links antigos (/w/{slug}/...) continuam funcionando depois da troca pra
  // URLs por caminho (/{slug}/...).
  async redirects() {
    return [
      { source: "/w/:slug", destination: "/:slug", permanent: false },
      { source: "/w/:slug/:path+", destination: "/:slug/:path+", permanent: false },
    ];
  },
  // Leitura/geracao de planilhas do chat: fica fora do bundle do servidor
  serverExternalPackages: ["exceljs"],
  images: {
    // Miniaturas dos videos do YouTube na listagem do admin
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
  experimental: {
    serverActions: {
      // Importar webinar em JSON: com transcricao o arquivo passa facil de 1 MB
      // (limite padrao). Folga pro overhead do multipart acima dos 10 MB aceitos.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
