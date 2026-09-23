/**
 * Dynamic frontend dev port selection for the Tauri dev launcher.
 * Node built-ins only; no dependency is added for this.
 */
import net from 'node:net';

export const DEFAULT_DEV_PORT = 40000;
/** How many consecutive ports above the preferred one are probed before falling back to the OS. */
export const DEV_PORT_WINDOW = 99;

/** Returns the port from a DIFFUSION_DEV_PORT value, or null when it is missing or unusable. */
export function parseDevPort(raw) {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  if (text === '') return null;
  const port = Number(text);
  return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
}

/** True when 127.0.0.1:<port> can be bound right now. The probe socket is closed before resolving. */
export function isPortFree(port) {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen({ host: '127.0.0.1', port, exclusive: true });
  });
}

/** First free port in [start, start + window], or null when that whole range is taken. */
export async function pickDevPort({ start = DEFAULT_DEV_PORT, window = DEV_PORT_WINDOW, isFree = isPortFree } = {}) {
  const last = Math.min(start + window, 65535);
  for (let port = start; port <= last; port += 1) {
    if (await isFree(port)) return port;
  }
  return null;
}

/** OS-assigned free port, used only when the preferred range is exhausted. */
export function fallbackPort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.once('listening', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
    probe.listen({ host: '127.0.0.1', port: 0 });
  });
}
