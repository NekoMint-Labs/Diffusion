import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const DEFAULT_DEV_PORT = 40000;
/** scripts/tauri-dev.mjs sets DIFFUSION_DEV_PORT; anything unusable keeps the default. */
function resolveDevPort(raw: string | undefined): number {
    const port = Number(raw);
    return Number.isInteger(port) && port > 0 && port < 65536 ? port : DEFAULT_DEV_PORT;
}
export default defineConfig({
    plugins: [react()], clearScreen: false,
    server: { host: '127.0.0.1', port: resolveDevPort(process.env.DIFFUSION_DEV_PORT), strictPort: true,
        watch: {
            // Cargo locks/replaces Windows build artifacts during `tauri dev`.
            ignored: ['**/src-tauri/target/**'],
        },
        proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } } },
    build: { target: 'es2022' },
});
