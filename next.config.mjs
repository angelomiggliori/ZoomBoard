/** @type {import('next').NextConfig} */

// Publicamos no GitHub Pages em https://angelomiggliori.github.io/ZoomBoard
// Por isso os assets precisam do prefixo /ZoomBoard quando o build roda no CI.
// Ativamos isso apenas quando GITHUB_PAGES=true, para o preview do v0 (e o
// `next dev` local) continuarem funcionando na raiz "/".
const isGithubPages = process.env.GITHUB_PAGES === "true"
const repo = "ZoomBoard"

const nextConfig = {
  // Gera um site 100% estático em ./out (necessário para o GitHub Pages,
  // que não roda servidor Node).
  output: "export",

  // Prefixo de caminho para assets e rotas no GitHub Pages.
  basePath: isGithubPages ? `/${repo}` : "",
  assetPrefix: isGithubPages ? `/${repo}/` : "",

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    // O GitHub Pages não tem o otimizador de imagens do Next, então servimos
    // as imagens sem otimização.
    unoptimized: true,
  },

  // URLs terminam em barra e geram index.html por pasta — evita 404 no Pages.
  trailingSlash: true,
}

export default nextConfig
