import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

type PresencePhase = 'ghost' | 'recall';

export function TransientTextPresence({ phase, children }: {
    phase: PresencePhase;
    children: ReactNode;
}) {
    const reduced = useReducedMotion();
    const ghost = phase === 'ghost';
    const opacity = ghost ? [0.2, 0.66, 1] : [0.34, 0.74, 1];
    const settle = ghost ? [2, 0.5, 0] : [1.5, 0.35, 0];

    return <motion.p
        data-presence={phase}
        initial={reduced ? false : { opacity: opacity[0], y: settle[0] }}
        animate={reduced ? { opacity: 1, y: 0 } : { opacity, y: settle }}
        transition={{ duration: reduced ? 0 : ghost ? 0.32 : 0.34, times: [0, 0.58, 1], ease: [0.22, 1, 0.36, 1] }}
        style={reduced ? undefined : { willChange: 'transform, opacity' }}
    >
        {children}
    </motion.p>;
}
