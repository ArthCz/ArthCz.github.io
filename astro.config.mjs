import { defineConfig } from 'astro/config';

// Site 100% estático. Nao existe backend, banco de dados ou login.
export default defineConfig({
  // Endereco publico (GitHub Pages). Para o site ocupar a raiz do dominio, o
  // repositorio tem que se chamar "ArthCz.github.io" - por isso nao existe
  // subpasta e nenhum caminho interno precisa de ajuste.
  site: 'https://arthcz.github.io',
  server: {
    host: true,
    port: 4321,
  },
  // A barra de ferramentas de desenvolvimento do Astro fica fora do caminho
  // para nao atrapalhar a visualizacao do layout.
  devToolbar: {
    enabled: false,
  },
});
