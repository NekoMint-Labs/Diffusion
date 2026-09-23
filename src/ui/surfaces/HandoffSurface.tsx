import { t as msg } from '../../shared/i18n.ts';
import { useState } from 'react';
import type { ProjectState } from '../../core/model.ts';
import type { PlatformAdapter } from '../../platform/contracts.ts';
import { handoffMarkdown } from '../../core/world.ts';
import { Surface } from './Surface.tsx';
import { Button } from '../primitives/Button.tsx';
export function HandoffSurface({ project, crystalId, platform, onClose }: {
    project: ProjectState;
    crystalId: string;
    platform: PlatformAdapter;
    onClose: () => void;
}) {
    const [message, setMessage] = useState('');
    /** A handoff that could not be composed is a failure, not an export whose body is an error
     * message. The preview used to render `String(error)` as its own content, which put a raw thrown
     * value where the carry-forward document belongs. */
    let text: string | null = null;
    try {
        text = handoffMarkdown(project, crystalId);
    }
    catch {
        text = null;
    }
    const save = async () => {
        if (text === null)
            return;
        try {
            const done = await platform.saveExport(new TextEncoder().encode(text), 'diffusion-handoff.md', 'text/markdown;charset=utf-8');
            setMessage(msg(done ? 'Handoff export prepared.' : 'Export cancelled.'));
        }
        catch {
            setMessage(msg('The handoff file could not be saved.'));
        }
    };
    return <Surface title={msg("From commitment into action")} subtitle={msg("Carry the Crystal, context and evidence limits into the next tool.")} level="focus" onClose={onClose} actions={<Button variant="solid" disabled={text === null} onClick={() => void save()}>{msg("Export Markdown")}</Button>}><p className="muted">{msg("This preview does not execute anything, create tasks or grant an agent new authority. Local original files are not included.")}</p>{text === null ? <p role="alert">{msg('This Crystal could not be written as a handoff. Nothing was exported.')}</p> : <pre className="handoff-preview">{text}</pre>}<p role="status">{msg(message)}</p></Surface>;
}
