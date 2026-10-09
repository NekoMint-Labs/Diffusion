import { useLayoutEffect, useMemo } from 'react';
import type { ProjectController } from '../../core/controller.ts';
import { useUI } from '../../ui/store.ts';
import { ProposalArrivals } from './proposalArrivals.ts';

/** Keep request/selection capture synchronous with the Field's existing lifecycle. */
export function useProposalArrivals(controller: ProjectController): ProposalArrivals {
    const arrivals = useMemo(() => new ProposalArrivals(controller.getSnapshot().session.ghosts), [controller]);
    useLayoutEffect(() => {
        const capture = () => {
            const state = useUI.getState();
            arrivals.observe(controller.getSnapshot().session.ghosts, state.operation);
            arrivals.protect(state.selection);
        };
        capture();
        const stopController = controller.subscribe(capture), stopUI = useUI.subscribe(capture);
        return () => { stopController(); stopUI(); };
    }, [controller, arrivals]);
    return arrivals;
}
