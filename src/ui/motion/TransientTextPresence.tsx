import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { MOTION_DURATION, MOTION_EASE } from './tokens.ts';

type PresencePhase = 'ghost' | 'recall';

export function TransientTextPresence({ phase, children }: {
    phase: PresencePhase;
    children: ReactNode;
}) {
    const reduced = useReducedMotion();
    const ghost = phase === 'ghost';
    const opacity = ghost ? [0.72, 0.9, 1] : [0.64, 0.86, 1];
    const settle = ghost ? [2, 0.5, 0] : [1.5, 0.35, 0];

    return <motion.p
        data-presence={phase}
        initial={reduced ? false : { opacity: opacity[0], y: settle[0] }}
        animate={reduced ? { opacity: 1, y: 0 } : { opacity, y: settle }}
        transition={{ duration: reduced ? 0 : MOTION_DURATION.spatial, times: [0, 0.58, 1], ease: MOTION_EASE.settle }}
        style={reduced ? undefined : { willChange: 'transform, opacity' }}
    >
        {children}
    </motion.p>;
}
