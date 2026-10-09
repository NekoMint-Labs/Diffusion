import type { Ref } from 'react';
import { t } from '../../shared/i18n.ts';

/** A compact screen-space key follows the existing Field heading, outside the bottom dock. */
export function ConnectionKey({ elementRef, hasHierarchy, hasRelations, local }: {
    elementRef: Ref<HTMLDivElement>; hasHierarchy: boolean; hasRelations: boolean; local: boolean;
}) {
    if (!hasHierarchy && !hasRelations) return null;
    return <div ref={elementRef} className="field-line-key" data-testid="field-line-key" data-surface="true" onPointerDown={event => event.stopPropagation()}>
        {hasHierarchy && <span title={t('Parent arrows connect visible thoughts. A blocked route may be hidden.')}><i className="line-key-parent" aria-hidden="true" />{t('Parent → child')}</span>}
        {hasRelations && <span><i className="line-key-relation" aria-hidden="true" />{t('Semantic relation · no arrow')}</span>}
        {hasRelations && <small data-testid="relation-visibility-hint">{t(local ? 'Select a thought to inspect its relations.' : 'Zoom in to inspect semantic relations.')}</small>}
    </div>;
}
