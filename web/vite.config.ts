import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"

export default defineConfig({
    plugins: [react(), tailwindcss()],
    // Read the single root .env instead of a separate web/.env.
    // Only VITE_-prefixed vars are exposed to the browser bundle.
    envDir: fileURLToPath(new URL("..", import.meta.url)),
    server: {
        port: 5173,
        host: true
    }
})
