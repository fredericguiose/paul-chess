import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `public/engine/` contient stockfish-18-lite-single.{js,wasm} — 7,3 Mo, servis
  // en statique. On ne passe PAS par le paquet npm `stockfish` (251 Mo décompressés,
  // dont deux copies d'un réseau de 113 Mo dont on n'a pas besoin).
  build: {
    target: 'es2022',
    // Le .wasm doit rester un fichier servi par URL : le loader de Stockfish va le
    // chercher lui-même au runtime. Ne jamais l'inliner.
    assetsInlineLimit: 4096
  },
  worker: {
    format: 'es'
  }
})
