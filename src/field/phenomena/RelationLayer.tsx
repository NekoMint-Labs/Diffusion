import type { RefObject } from 'react';
import type { RelationPhenomenon } from './describe.ts';

export function RelationLayer({ layerRef, probe, operationId, relations, relevantIds }: {
    layerRef: RefObject<SVGGElement | null>;
    probe: Pick<RelationPhenomenon, 'path'> | null;
    operationId?: string;
    relations: RelationPhenomenon[];
    relevantIds: ReadonlySet<string>;
}) {
    return <svg className="phenomena relation-phenomena" aria-hidden="true">
        <g ref={layerRef} className="relations">
            {probe && <g data-operation-id={operationId} className="relation probing"><path d={probe.path}/></g>}
            {relations.map(relation => <g key={relation.id} data-relation-id={relation.id} className={`relation ${relation.confirmed ? 'confirmed' : 'tentative'} ${relevantIds.has(relation.id) ? 'relevant' : ''} ${relation.released ? 'exiting' : ''}`}>
                <path d={relation.path}/>
            </g>)}
        </g>
    </svg>;
}
