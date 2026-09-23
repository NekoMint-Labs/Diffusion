import type { StructureProposal } from '../../core/model.ts';
import type { GeometryCache } from '../spatial/index.ts';

function groupBounds(ids: string[], geometry: GeometryCache) {
    const boxes = ids.map(key => geometry.get(key)).filter((box): box is NonNullable<typeof box> => Boolean(box));
    if (!boxes.length) return null;
    const left = Math.min(...boxes.map(box => box.x));
    const top = Math.min(...boxes.map(box => box.y));
    const right = Math.max(...boxes.map(box => box.x + box.width));
    const bottom = Math.max(...boxes.map(box => box.y + box.height));
    const pad = 28;
    return { x: left - pad, y: top - pad, width: right - left + pad * 2, height: bottom - top + pad * 2 };
}

/** A structure proposal is presentation, not a container. These local outlines never move Thoughts
 * and disappear if the proposal is cancelled or replaced. */
export function StructureOverlay({ proposals, geometry }: { proposals: StructureProposal[]; geometry: GeometryCache }) {
    if (!proposals.length) return null;
    return <svg className="phenomena structure-overlay" aria-label="Structure proposal">
        {proposals.flatMap(proposal => proposal.groups.map((group, index) => {
            const bounds = groupBounds(group.thoughtIds, geometry);
            if (!bounds) return null;
            return <g key={`${proposal.id}:${index}`} data-structure-id={proposal.id}>
                <rect x={bounds.x} y={bounds.y} width={bounds.width} height={bounds.height} rx="18" ry="18" />
                <text x={bounds.x + 12} y={bounds.y - 8}>{group.label}</text>
            </g>;
        }))}
    </svg>;
}
