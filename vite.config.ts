import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000, // 5 MiB
          navigateFallbackDenylist: [/^\/api/]
        },
        manifest: {
          name: 'SALU AI Plus',
          short_name: 'SALU AI',
          description: 'Your advanced AI companion designed for the SALU community',
          theme_color: '#0f172a',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/aa/Shah_Abdul_Latif_University_logo.png/250px-Shah_Abdul_Latif_University_logo.png',
              sizes: '250x250',
              type: 'image/png'
            },
            {
              src: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/aa/Shah_Abdul_Latif_University_logo.png/250px-Shah_Abdul_Latif_University_logo.png',
              sizes: '250x250',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    logLevel: 'error',
    clearScreen: false,
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: false,
    },
  };
});
