// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',        // listen everywhere
    port: 5173,
    https: {
      // point at the +1 files mkcert just generated
      key:  fs.readFileSync(path.resolve(__dirname, '192.168.121.113+1-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '192.168.121.113+1.pem')),
    },
    cors: true,            // allow any origin (you can lock this down if you like)
    allowedHosts: 'all',   // accept requests for both your IP and local-conference.test
  },
})
