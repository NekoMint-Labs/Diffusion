import type { Point } from '../../core/model.ts';
import type { Bounds } from '../spatial/geometry.ts';
import type { RelationPhenomenon } from './describe.ts';
import { placeRelationLabels } from './relationLabelPlacement.ts';
import { RelationToken } from './RelationToken.tsx';

export function RelationLabels({ relations, thoughtBounds, zoom, onRelation, onKeep, onIgnore, onRename }: {
    relations: RelationPhenomenon[];
    thoughtBounds: Bounds[];
    zoom: number;
    onRelation: (id: string, point: Point) => void;
    onKeep: (id: string) => void;
    onIgnore: (id: string) => void;
    onRename: (id: string, label: string) => void;
}) {
    const placements = placeRelationLabels(relations, thoughtBounds, zoom);
    return <>{relations.map(relation => {
        const placement = placements[relation.id];
        return placement ? <RelationToken key={relation.id} relation={relation} placement={placement} onOpen={onRelation} onKeep={onKeep} onIgnore={onIgnore} onRename={onRename}/> : null;
    })}</>;
}
