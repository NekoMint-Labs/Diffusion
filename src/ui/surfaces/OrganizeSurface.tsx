import { useEffect, useRef, useState } from 'react';
import { t as msg } from '../../shared/i18n.ts';
import type { Point, StructureProposal } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';
import type { AIRuntime } from '../../ai/runtime.ts';
import { Button } from '../primitives/Button.tsx';
import { Surface } from './Surface.tsx';

export function OrganizeSurface({ controller, runtime, scopeIds, anchor, onClose }: {
    controller: ProjectController;
    runtime: AIRuntime;
    scopeIds: string[];
    anchor?: Point;
    onClose: () => void;
}) {
    const [proposalId, setProposalId] = useState<string | null>(null);
    const [version, setVersion] = useState(0);
    const [running, setRunning] = useState(false);
    const mounted = useRef(true);
    const proposalRef = useRef<string | null>(null);
    const setActiveProposal = (id: string | null) => { proposalRef.current = id; if (mounted.current) setProposalId(id); };
    const clearProposal = (id = proposalRef.current) => {
        if (id && controller.getSnapshot().session.structures[id]) controller.dismissStructureProposal(id);
        if (!id || id === proposalRef.current) setActiveProposal(null);
    };
    const run = async () => {
        clearProposal();
        setRunning(true);
        let emitted: string | null = null;
        await runtime.run('organize', 'Reveal structure that is already present in these selected thoughts. Keep it restrained; it is valid to say there is not enough stable structure yet.', scopeIds, {
            maxCandidates: 1,
            activity: 'bridge',
            onEmission: key => { emitted = key; },
        });
        const structureId = emitted && controller.getSnapshot().session.structures[emitted] ? emitted : null;
        if (mounted.current) { setActiveProposal(structureId); setRunning(false); setVersion(value => value + 1); }
    };
    useEffect(() => { mounted.current = true; void run(); return () => { mounted.current = false; runtime.cancel(); clearProposal(); }; // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const snapshot = controller.getSnapshot();
    const proposal: StructureProposal | null = proposalId ? snapshot.session.structures[proposalId] ?? null : null;
    const relations = proposal?.relationIds.map(key => snapshot.session.phenomena[key]).filter((relation): relation is NonNullable<typeof relation> => Boolean(relation)) ?? [];
    const apply = () => {
        if (proposal) controller.applyStructureProposal(proposal.id);
        setActiveProposal(null);
        onClose();
    };
    const cancel = () => { clearProposal(); onClose(); };
    return <Surface title={msg('Organize thoughts')} subtitle={msg('Reveal structure already present here. Nothing changes until you apply it.')} level="anchored" anchor={anchor} onClose={cancel} className="organize-surface">
        <div data-testid="organize-proposal" data-version={version}>
            {running ? <p>{msg('Looking for structure...')}</p> : proposal ? <div className="organize-proposals" data-testid="structure-proposal">
                {proposal.groups.map((group, index) => <article key={`${group.label}-${index}`} className="structure-group-summary"><strong>{group.label}</strong><ul>{group.thoughtIds.map(key => snapshot.project.thoughts[key]).filter(Boolean).map(thought => <li key={thought.id}>{thought.text}</li>)}</ul></article>)}
                {proposal.note && <p className="structure-note">{proposal.note}</p>}
                {relations.map(relation => <article key={relation.id}><strong>{relation.label}</strong>{relation.explanation && <p>{relation.explanation}</p>}<small>{snapshot.project.thoughts[relation.a]?.text} <span aria-hidden="true">{String.fromCharCode(8596)}</span> {snapshot.project.thoughts[relation.b]?.text}</small></article>)}
                {!proposal.groups.length && !relations.length && !proposal.note && <p className="muted">{msg('No clear structure was supported by these thoughts.')}</p>}
            </div> : <p className="muted">{msg('No clear structure was supported by these thoughts.')}</p>}
        </div>
        <div className="surface-choice">
            <Button variant="solid" tone="attention" disabled={running || !proposal} onClick={apply}>{msg('Apply')}</Button>
            <Button variant="outline" disabled={running} onClick={() => void run()}>{msg('Try another')}</Button>
            <Button variant="ghost" onClick={cancel}>{msg('Cancel')}</Button>
        </div>
    </Surface>;
}
