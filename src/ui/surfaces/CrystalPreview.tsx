import { t as msg } from '../../shared/i18n.ts';
import { useState } from 'react';
import { makeThought, type Point } from '../../core/model.ts';
import type { ProjectController } from '../../core/controller.ts';
import { Surface } from './Surface.tsx';
import { Button } from '../primitives/Button.tsx';
import { presentSpatialTransition } from '../motion/spatialGrammar.ts';
export interface CrystalDraft {
    targetId?: string;
    scopeIds: string[];
    text: string;
}
export function CrystalPreview({ controller, draft, point, onClose }: {
    controller: ProjectController;
    draft: CrystalDraft;
    point: Point;
    onClose: () => void;
}) {
    const [text, setText] = useState(draft.text);
    const [error, setError] = useState('');
    const confirm = () => {
        try {
            if (draft.targetId) {
                controller.dispatch({ type: 'crystal.form', id: draft.targetId, text: text.trim() });
                presentSpatialTransition('settle', [draft.targetId]);
            }
            else {
                const thought = { ...makeThought(text.trim(), point), kind: 'crystal' as const, kept: true, origin: { projectId: controller.getSnapshot().project.id, note: 'Formed from chosen thoughts' } };
                controller.dispatch({ type: 'crystal.create', thought, basedOn: draft.scopeIds });
                presentSpatialTransition('settle', [thought.id]);
            }
            onClose();
        }
        catch (e) {
            // A refused commitment is not a device failure: the wording or the chosen scope did not
            // pass validation. The product's sentence names the next step; the thrown detail stays
            // for a developer rather than becoming "Error: …" in an alert.
            console.error('[diffusion]', 'crystal', e);
            setError(msg('This Crystal could not be formed. Nothing was committed; check the wording and the thoughts it is based on.'));
        }
    };
    return <Surface title={msg("Let this become a Crystal")} subtitle={msg("A deliberate commitment, not a claim of objective truth.")} level="anchored" onClose={onClose}>
 <label className="eyebrow" htmlFor="crystal-wording">{msg("Your wording")}</label><textarea id="crystal-wording" className="draft-text" value={text} onChange={e => setText(e.target.value)} rows={7} maxLength={20000}/><p className="tiny muted">{msg("The preview is not a Crystal. Confirm only the part you are ready to stand behind. A multi-thought Crystal is a new landmark; its source thoughts are not rewritten.")}</p><Button variant="solid" tone="attention" disabled={!text.trim()} onClick={confirm}>{msg("Confirm this Crystal")}</Button>{error && <p role="alert">{error}</p>}
 </Surface>;
}
