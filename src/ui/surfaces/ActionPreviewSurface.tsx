import { useState } from 'react';
import { t as msg } from '../../shared/i18n.ts';
import type { Point } from '../../core/model.ts';
import type { ThinkingDirectionCount } from '../commands/thinking.ts';
import { THINKING_DIRECTION_COUNTS, THINKING_DEFAULTS } from '../commands/thinking.ts';
import { Button } from '../primitives/Button.tsx';
import { Checkbox } from '../primitives/Checkbox.tsx';
import { Surface } from './Surface.tsx';

export type PreviewAction = 'continue' | 'angle' | 'ask';

const copy = {
    continue: { title: 'Continue thinking', helper: 'Follow the current line forward.', prompt: 'How many next steps?' },
    angle: { title: 'Another angle', helper: 'Reframe this from a different direction.', prompt: 'How many different directions?' },
    ask: { title: 'Generate a question', helper: 'Generate a question that could move the thinking.', prompt: 'How many questions?' },
} as const;

export function ActionPreviewSurface({ action, anchor, allowSources, allowWeb, onRun, onClose }: {
    action: PreviewAction;
    anchor?: Point;
    allowSources: boolean;
    allowWeb: boolean;
    onRun: (options: { count: ThinkingDirectionCount; fieldSources: boolean; web: boolean }) => void;
    onClose: () => void;
}) {
    const [count, setCount] = useState<ThinkingDirectionCount>(THINKING_DEFAULTS.directions);
    const [sources, setSources] = useState(THINKING_DEFAULTS.fieldSources);
    const [web, setWeb] = useState(THINKING_DEFAULTS.web);
    const details = allowSources || allowWeb;
    const text = copy[action];
    return <Surface title={msg(text.title)} subtitle={msg(text.helper)} level="anchored" anchor={anchor} onClose={onClose} className="action-preview-surface">
        <p className="action-preview-question">{msg(text.prompt)}</p>
        <div className="action-count" role="group" aria-label={msg('Result count')}>
            {THINKING_DIRECTION_COUNTS.map(value => <Button key={value} variant={count === value ? 'solid' : 'outline'} size="sm" aria-pressed={count === value} onClick={() => setCount(value)}>{value}</Button>)}
        </div>
        {details && <details className="action-preview-options"><summary>{msg('More options')}</summary>
            {allowSources && <Checkbox checked={sources} onChange={setSources} label={msg('Use Field sources')}/>} 
            {allowWeb && <Checkbox checked={web} onChange={setWeb} label={msg('Use web search')}/>} 
        </details>}
        <div className="surface-choice"><Button data-testid="action-preview-run" variant="solid" tone="attention" onClick={() => onRun({ count, fieldSources: sources, web })}>{msg('Start')}</Button></div>
    </Surface>;
}
