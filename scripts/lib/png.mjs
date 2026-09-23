/**
 * A minimal PNG reader, shared by the standalone motion-capture tooling.
 *
 * It decodes exactly what Chromium's `page.screenshot()` produces — 8-bit truecolour (RGB or RGBA),
 * non-interlaced — with `node:zlib`. Reading real pixels is the point: a computed-style proxy would
 * be a weaker claim about what the product actually paints.
 *
 * `tests/e2e/visual.spec.ts` deliberately keeps its own inlined copy: the gate must not depend on a
 * script directory, and its copy is ~40 lines. Everything else imports this one.
 */
import zlib from 'node:zlib';

export function decodePng(buffer) {
    if (buffer.readUInt32BE(0) !== 0x89504e47)
        throw new Error('not a PNG');
    let position = 8, width = 0, height = 0, bitDepth = 0, colorType = -1, interlace = 0;
    const idat = [];
    while (position < buffer.length) {
        const length = buffer.readUInt32BE(position); position += 4;
        const type = buffer.toString('ascii', position, position + 4); position += 4;
        const chunk = buffer.subarray(position, position + length); position += length + 4;
        if (type === 'IHDR') { width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4); bitDepth = chunk[8]; colorType = chunk[9]; interlace = chunk[12]; }
        else if (type === 'IDAT') idat.push(chunk);
        else if (type === 'IEND') break;
    }
    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
    if (!channels || bitDepth !== 8 || interlace !== 0)
        throw new Error(`unsupported PNG: colorType ${colorType}, bitDepth ${bitDepth}, interlace ${interlace}`);
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const out = Buffer.alloc(height * stride);
    let read = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[read++];
        const line = raw.subarray(read, read + stride); read += stride;
        const previous = y ? out.subarray((y - 1) * stride, y * stride) : null;
        const current = out.subarray(y * stride, (y + 1) * stride);
        for (let x = 0; x < stride; x++) {
            const a = x >= channels ? current[x - channels] : 0;
            const b = previous ? previous[x] : 0;
            const c = previous && x >= channels ? previous[x - channels] : 0;
            let value = line[x];
            if (filter === 1) value += a;
            else if (filter === 2) value += b;
            else if (filter === 3) value += (a + b) >> 1;
            else if (filter === 4) {
                const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
            }
            else if (filter !== 0) throw new Error(`unknown PNG filter ${filter}`);
            current[x] = value & 0xff;
        }
    }
    return { width, height, channels, data: out };
}

/** The mean colour of an 8×8 patch: wide enough that grain averages out, narrow enough that it is
 * still "a point" on the Field. Eight widely separated patches are how a static-material claim is
 * measured without letting the words on top of the Field decide it. */
export function patchMean(image, x, y, size = 8) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y; yy < y + size; yy++) for (let xx = x; xx < x + size; xx++) {
        const i = (yy * image.width + xx) * image.channels;
        r += image.data[i]; g += image.data[i + 1]; b += image.data[i + 2]; n++;
    }
    return { r: r / n, g: g / n, b: b / n };
}

/** Per-channel standard deviation and mean over a rectangle: how much material a region has.
 * A flat plane measures 0. (Includes whatever else is painted in the region, so it is a
 * material-plus-content figure — the eight-patch spread above is the content-free one.) */
export function regionStats(image, x, y, width, height) {
    let n = 0, sr = 0, sg = 0, sb = 0, qr = 0, qg = 0, qb = 0;
    for (let yy = y; yy < y + height; yy++) for (let xx = x; xx < x + width; xx++) {
        const i = (yy * image.width + xx) * image.channels;
        const r = image.data[i], g = image.data[i + 1], b = image.data[i + 2];
        n++; sr += r; sg += g; sb += b; qr += r * r; qg += g * g; qb += b * b;
    }
    const stats = value => ({ mean: value.sum / n, deviation: Math.sqrt(Math.max(0, value.square / n - (value.sum / n) ** 2)) });
    const [r, g, b] = [stats({ sum: sr, square: qr }), stats({ sum: sg, square: qg }), stats({ sum: sb, square: qb })];
    return { r, g, b, lumaDeviation: Math.sqrt(Math.max(0, (qr + qg + qb) / (3 * n) - ((sr + sg + sb) / (3 * n)) ** 2)) };
}

/** How much two frames of the same region differ: the mean absolute per-channel delta and the
 * share of pixels that moved by more than one step. That is the closest a still can get to
 * "a person watching this would see it move". */
export function frameDelta(a, b) {
    if (a.width !== b.width || a.height !== b.height)
        throw new Error('frame sizes differ');
    let sum = 0, count = 0, moved = 0, worst = 0;
    for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
        const i = (y * a.width + x) * a.channels;
        const delta = (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2])) / 3;
        sum += delta; count++;
        if (delta > 1) moved++;
        if (delta > worst) worst = delta;
    }
    return { meanDelta: sum / count, movedShare: moved / count, worstDelta: worst };
}
