import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

const seen = new Set<string>();
const noise = '░▒▓◇○△+<>01';
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** Only the decorative overlay scrambles. The original stays selectable and accessible. */
export function ScrambleText({ text, animationKey }: { text: string; animationKey: string }) {
    const reduced = useReducedMotion();
    const identity = animationKey + ':' + text;
    const [frame, setFrame] = useState<{ identity: string; locked: number; noise: string[] } | null>(null);
    const skip = useRef(false);
    useEffect(() => {
        skip.current = false;
        if (reduced || seen.has(identity)) { setFrame(null); return; }
        seen.add(identity);
        if (seen.size > 256) seen.delete(seen.values().next().value!);
        const chars = Array.from(segmenter.segment(text), part => part.segment);
        const start = performance.now();
        let request = 0;
        let last = -50;
        const tick = (now: number) => {
            const elapsed = now - start;
            const locked = Math.floor(elapsed / 50);
            if (skip.current || locked >= chars.length) { setFrame(null); return; }
            if (elapsed - last >= 40) {
                last = elapsed;
                setFrame({ identity, locked, noise: chars.map((char, index) => index < locked || /\s/u.test(char) ? char : noise[Math.floor(Math.random() * noise.length)]) });
            }
            request = requestAnimationFrame(tick);
        };
        request = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(request);
    }, [identity, text, reduced]);
    const active = !reduced && frame?.identity === identity;
    const chars = active ? Array.from(segmenter.segment(text), part => part.segment) : [];
    const finish = () => { skip.current = true; setFrame(null); };
    return <span className="scramble-text" data-scrambling={active || undefined} onPointerDown={finish} onCopy={finish}>
        <span className="scramble-source">{text}</span>
        {active && <span className="scramble-display" aria-hidden="true">{chars.map((char, index) => <span className="scramble-char" key={index}><span className="scramble-width">{char}</span><span className="scramble-glyph" data-locked={index < frame.locked || undefined}>{frame.noise[index]}</span></span>)}</span>}
    </span>;
}
