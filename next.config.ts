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
};

export default nextConfig;
