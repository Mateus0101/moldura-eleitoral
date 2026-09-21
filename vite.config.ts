import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const SETE_DIAS = 7 * 24 * 60 * 60

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt": a versão nova espera a pessoa aceitar. Com atualização automática a página recarregaria
      // no meio da montagem da moldura e a foto escolhida se perderia.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'maskable-512x512.png'],
      manifest: {
        name: 'Moldura Eleitoral', // nome provisório, como o resto do projeto
        short_name: 'Moldura',
        description: 'Monte uma moldura de apoio ao seu candidato com a sua foto e compartilhe nas redes.',
        lang: 'pt-BR',
        display: 'standalone',
        theme_color: '#e3e8e1',
        background_color: '#e3e8e1',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Só o app (HTML, JS, CSS) vai para o pré-cache. As ~20 mil fotos e os JSON dos candidatos ficam
        // de fora e entram no cache conforme a pessoa usa.
        globPatterns: ['**/*.{js,css,html,webmanifest}'],
        // O conversor de HEIC (heic-to, ~3 MB) também fica de fora: quase ninguém usa, e quem usa o
        // baixa uma vez (regra de cache abaixo).
        globIgnores: ['fotos/**', 'candidatos/**', 'assets/heic-to-*.js'],
        // Abrir o arquivo de licenças em outra aba é uma navegação: sem isto o service worker entregaria o app no lugar.
        navigateFallbackDenylist: [/\.txt$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/assets\/heic-to-[^/]+\.js$/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'conversor-heic',
              expiration: { maxEntries: 2 }, // a versão nova troca a antiga
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Dados dos candidatos: rede primeiro (o TSE atualiza), cache se estiver sem sinal.
            urlPattern: ({ url }) => url.pathname.includes('/candidatos/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'candidatos',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 40, maxAgeSeconds: SETE_DIAS },
            },
          },
          {
            // Fotos: cache primeiro, já que quase nunca mudam (~5,5 KB cada). Só respostas 200, nunca 404.
            urlPattern: ({ url }) => url.pathname.includes('/fotos/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fotos',
              expiration: { maxEntries: 1500, maxAgeSeconds: SETE_DIAS },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
})
