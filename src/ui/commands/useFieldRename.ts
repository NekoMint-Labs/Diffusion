import { useRef, useState } from 'react';
import type { ProjectController } from '../../core/controller.ts';
import type { ProjectState } from '../../core/model.ts';
import { t } from '../../shared/i18n.ts';
/** Inline Field title editing. The rename itself stays one canonical user action. */
export function useFieldRename({ project, controller, focusField, announce }: {
    project: ProjectState;
    controller: ProjectController;
    focusField: () => void;
    announce: (text: string) => void;
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const settled = useRef(false);
    return {
        draft,
        begin: () => {
            settled.current = false;
            setDraft(project.id === 'demo' ? t(project.title) : project.title);
        },
        change: (value: string) => setDraft(value),
        commit: () => {
            if (settled.current)
                return;
            settled.current = true;
            const title = (draft ?? '').trim();
            setDraft(null);
            if (title && title !== project.title) {
                try {
                    controller.dispatch({ type: 'field.rename', title });
                }
                catch (error) {
                    announce(String(error));
                }
            }
            focusField();
        },
        cancel: () => {
            settled.current = true;
            setDraft(null);
            focusField();
        },
    };
}
