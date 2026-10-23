import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from 'motion/react';

/** Screen-space feedback never intercepts gestures, selection, or camera transforms. */
export function ClickRipples() {
    const reduced = useReducedMotion();
    const serial = useRef(0);
    const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
    useEffect(() => {
        if (reduced) { setRipples([]); return; }
        let down: { id: number; x: number; y: number } | null = null;
        const begin = (event: PointerEvent) => {
            if (event.button === 0 && event.isPrimary) down = { id: event.pointerId, x: event.clientX, y: event.clientY };
        };
        const end = (event: PointerEvent) => {
            const start = down; down = null;
            if (!start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
            const ripple = { id: ++serial.current, x: event.clientX, y: event.clientY };
            setRipples(items => [...items.slice(-11), ripple]);
        };
        const cancel = () => { down = null; };
        document.addEventListener('pointerdown', begin, true);
        document.addEventListener('pointerup', end, true);
        document.addEventListener('pointercancel', cancel, true);
        return () => {
            document.removeEventListener('pointerdown', begin, true);
            document.removeEventListener('pointerup', end, true);
            document.removeEventListener('pointercancel', cancel, true);
        };
    }, [reduced]);
    return createPortal(<div className="click-ripple-layer" aria-hidden="true">{ripples.map(ripple => <i className="click-ripple" key={ripple.id} style={{ left: ripple.x, top: ripple.y }} onAnimationEnd={() => setRipples(items => items.filter(item => item.id !== ripple.id))}/>)}</div>, document.body);
}
