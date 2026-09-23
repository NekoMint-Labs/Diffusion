import net from 'node:net';
import { afterAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_DEV_PORT, DEV_PORT_WINDOW, fallbackPort, isPortFree, parseDevPort, pickDevPort,
} from '../../scripts/lib/dev-port.mjs';

const busy = (...ports) => async port => !ports.includes(port);
const listen = () => new Promise(resolve => {
  const server = net.createServer();
  server.listen({ host: '127.0.0.1', port: 0 }, () => resolve(server));
});

const servers = [];
afterAll(async () => {
  await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
});

describe('parseDevPort', () => {
  it('accepts a usable port and rejects anything else', () => {
    expect(parseDevPort('40003')).toBe(40003);
    expect(parseDevPort(' 40003 ')).toBe(40003);
    expect(parseDevPort(undefined)).toBeNull();
    expect(parseDevPort('')).toBeNull();
    expect(parseDevPort('abc')).toBeNull();
    expect(parseDevPort('NaN')).toBeNull();
    expect(parseDevPort('0')).toBeNull();
    expect(parseDevPort('70000')).toBeNull();
    expect(parseDevPort('40000.5')).toBeNull();
  });
});

describe('pickDevPort', () => {
  it('uses the preferred port when it is free', async () => {
    expect(await pickDevPort({ start: DEFAULT_DEV_PORT, isFree: busy() })).toBe(40000);
  });

  it('skips an occupied preferred port', async () => {
    expect(await pickDevPort({ start: 40000, isFree: busy(40000) })).toBe(40001);
  });

  it('skips several consecutive occupied ports', async () => {
    expect(await pickDevPort({ start: 40000, isFree: busy(40000, 40001, 40002) })).toBe(40003);
    expect(await pickDevPort({ start: 40000, isFree: busy(...Array.from({ length: 40 }, (_, i) => 40000 + i)) })).toBe(40040);
  });

  it('reports an exhausted window instead of inventing a port', async () => {
    const all = Array.from({ length: DEV_PORT_WINDOW + 1 }, (_, i) => 40000 + i);
    expect(await pickDevPort({ start: 40000, isFree: busy(...all) })).toBeNull();
  });
});

describe('real sockets', () => {
  it('detects a bound port and returns the next free one', async () => {
    servers.push(await listen());
    const taken = servers[0].address().port;
    expect(await isPortFree(taken)).toBe(false);
    expect(await isPortFree(taken - 1)).toBe(true);
    const picked = await pickDevPort({ start: taken });
    expect(picked).toBeGreaterThan(taken);
    expect(await isPortFree(picked)).toBe(true);
  });

  it('falls back to an OS-assigned free port', async () => {
    const port = await fallbackPort();
    expect(Number.isInteger(port)).toBe(true);
    expect(await isPortFree(port)).toBe(true);
  });
});
