import { serve } from '@hono/node-server';
import { createGateway } from './app.ts';
import { loadConfig } from './config.ts';
const config = loadConfig(process.env);
const server = serve({ fetch: createGateway(config).fetch, hostname: config.host, port: config.port });
console.info(`Diffusion gateway listening on ${config.host}:${config.port}. Provider secrets stay server-side.`);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.on(signal, () => server.close(() => process.exit(0)));
