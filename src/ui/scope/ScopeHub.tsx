import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { t } from '../../shared/i18n.ts';
import { contentTransition } from '../motion.ts';
import { Button } from '../primitives/Button.tsx';
import type { AIProposalKind } from '../../core/model.ts';
import type { ContextualAction } from '../commands/contextualActionModel.ts';
import type { ScopePlacement } from './scopePlacement.ts';

const MORE_HOVER_DELAY = 160;
export type AIProposalNextAction = 'keep' | 'continue' | 'angle' | 'answer' | 'ignore';

export function ScopeHub({ count, placement, actions, probing = false, proposalReview = false, aiProposalKind, onAction, onKeepAll, onKeepOriginal, onAIProposalAction, onMore }: {
    count: number;
    placement: ScopePlacement;
    actions: ContextualAction[];
    probing?: boolean;
    proposalReview?: boolean;
    aiProposalKind?: AIProposalKind;
    onAction: (id: string) => void;
    onKeepAll?: () => void;
    onKeepOriginal?: () => void;
    onAIProposalAction?: (action: AIProposalNextAction) => void;
    onMore: (trigger: HTMLElement) => void;
}) {
    const reduced = useReducedMotion();
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cancelMoreHover = () => {
        if (!hoverTimer.current) return;
        clearTimeout(hoverTimer.current);
        hoverTimer.current = null;
    };
    const openMore = (trigger: HTMLElement) => {
        cancelMoreHover();
        onMore(trigger);
    };
    const scheduleMore = (trigger: HTMLElement) => {
        cancelMoreHover();
        hoverTimer.current = setTimeout(() => {
            onMore(trigger);
            hoverTimer.current = null;
        }, MORE_HOVER_DELAY);
    };
    useEffect(() => () => cancelMoreHover(), []);

    return <motion.div data-testid="scope-hub" data-scope-hub="true" data-scope-side={placement.side} data-proposal-kind={aiProposalKind} className="scope-hub" role="toolbar" aria-label={`${t('Scope actions')}: ${t('Selection makes a temporary scope')}`} style={{ left: placement.x, top: placement.y }} initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : -2 }} animate={{ opacity: 1, y: 0 }} transition={contentTransition(!!reduced)} onPointerDown={event => event.stopPropagation()}>
        {count > 1 && <span className="scope-count" data-testid="scope-count">{t('{count} thoughts', { count })}</span>}
        <div className="scope-actions">
            {proposalReview ? <>
                <Button variant="ghost" size="sm" data-testid="proposal-keep-all" onClick={onKeepAll}>{t('Keep all')}</Button>
                <Button variant="ghost" size="sm" data-testid="proposal-keep-original" onClick={onKeepOriginal}>{t('Keep original')}</Button>
            </> : aiProposalKind === 'thought' ? <>
                <Button variant="ghost" size="sm" data-testid="ai-proposal-keep" onClick={() => onAIProposalAction?.('keep')}>{t('Keep this')}</Button>
                <Button variant="ghost" size="sm" data-testid="ai-proposal-continue" onClick={() => onAIProposalAction?.('continue')}>{t('Continue thinking')}</Button>
                <Button variant="ghost" size="sm" data-testid="ai-proposal-angle" onClick={() => onAIProposalAction?.('angle')}>{t('Another angle')}</Button>
            </> : aiProposalKind === 'question' ? <>
                <Button variant="ghost" size="sm" data-testid="ai-question-answer" onClick={() => onAIProposalAction?.('answer')}>{t('Answer')}</Button>
                <Button variant="ghost" size="sm" data-testid="ai-proposal-keep" onClick={() => onAIProposalAction?.('keep')}>{t('Keep this')}</Button>
                <Button variant="ghost" size="sm" data-testid="ai-proposal-ignore" onClick={() => onAIProposalAction?.('ignore')}>{t('Ignore')}</Button>
            </> : actions.map(action => {
                const finding = probing && action.id === 'find-relation';
                const descriptionId = `scope-action-${action.id}-description`;
                return <span className="scope-action" key={action.id}>
                    <Button variant="ghost" size="sm" data-testid={action.testId} disabled={finding} aria-describedby={descriptionId} onClick={() => onAction(action.id)}>{t(finding ? 'Finding a relation...' : action.label)}</Button>
                    <span id={descriptionId} role="tooltip" className="scope-action-description">{t(action.description)}</span>
                </span>;
            })}
            {!aiProposalKind && <Button variant="ghost" size="sm" data-testid="thought-more" aria-label={t('More thought actions')} aria-haspopup="menu"
                onPointerEnter={event => scheduleMore(event.currentTarget)} onPointerLeave={cancelMoreHover}
                onKeyDown={event => {
                    if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openMore(event.currentTarget);
                    }
                }}
                onClick={event => openMore(event.currentTarget)}><span aria-hidden="true">...</span></Button>}
        </div>
    </motion.div>;
}
