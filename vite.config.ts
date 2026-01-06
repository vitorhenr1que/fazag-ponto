import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: true,
      },
      plugins: [
        react(),
        VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "favicon.ico",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "maskable-512x512.png",
      ],
      manifest: {
        name: "Ponto FAZAG",
        short_name: "Ponto",
        description: "Controle de ponto em rede local",
        theme_color: "#0B1F3B",
        background_color: "#0B1F3B",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // evita “tela branca” por cache velho em updates
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,

        // IMPORTANTE: não cachear chamadas de API/ping
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/__ping"),
            handler: "NetworkOnly",
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
        {
      name: "ping-endpoint",
      configureServer(server) {
        server.middlewares.use("/__ping", (_req, res) => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/plain");
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
          res.end("pong");
        });
      },
    },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
