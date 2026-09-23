import { t } from '../../shared/i18n.ts';
import { createProject, id } from '../../core/model.ts';
import { demoProject } from '../../core/demo.ts';
import { exportFieldMarkdown, exportProjectJSON } from '../../core/world.ts';
import type { ProjectController } from '../../core/controller.ts';
import type { ProjectRepository } from '../../storage/repository.ts';
import type { PlatformAdapter } from '../../platform/contracts.ts';
import type { AIRuntime } from '../../ai/runtime.ts';
import type { DiffuseSession } from '../../ai/diffuse.ts';
import { deviceFailureNotice, notice } from './notice.ts';
import { feedback, report } from './feedback.ts';
import { fieldDepartureSequence } from '../motion/signature.ts';

/** How long a departure is allowed to hold the swap back. Presentation never owns a semantic
 * action: the Field leaves deliberately, but the crossing happens whether or not it finished. */
const DEPARTURE_BEAT_MS = 260;

/** Leaving is part of entering: the outgoing Field recedes before the composition root is
 * replaced, and the arrival sequence picks the new one up. The wait is bounded and the timeline
 * is reverted afterwards, so a refused switch leaves the Field exactly as it was. */
async function departField(): Promise<ReturnType<typeof fieldDepartureSequence>> {
    if (typeof document === 'undefined')
        return null;
    const app = document.querySelector<HTMLElement>('.app');
    const timeline = app ? fieldDepartureSequence(app) : null;
    if (!timeline)
        return null;
    await new Promise<void>(resolve => {
        const done = () => resolve();
        timeline.eventCallback('onComplete', done);
        setTimeout(done, DEPARTURE_BEAT_MS);
    });
    return timeline;
}

/** The Field as a file the person owns: create, duplicate, switch, export.
 *
 * Every operation here crosses a persistence boundary, so each one either flushes and verifies
 * the save first, or refuses and says so. Export is the portable recovery path and is therefore
 * always offered, including when saving itself has failed.
 */
export function useProjectActions({ controller, repository, platform, diffuse, runtime, onSwitchProject, closeSurface, closeMenu }: {
    controller: ProjectController;
    repository: ProjectRepository;
    platform: PlatformAdapter;
    diffuse: DiffuseSession;
    runtime: AIRuntime;
    onSwitchProject: (id: string) => Promise<void>;
    closeSurface: (cancelRequest?: boolean) => void;
    closeMenu: () => void;
}) {
    /** A lost Field is worse than a refused switch, so a failed save always stops the crossing. */
    async function ensureSaved() {
        await controller.flush();
        if (controller.getSnapshot().persistenceError)
            throw new Error(t('Save failed. Export the Field before changing worlds.'));
    }
    async function exportCanonical() {
        closeMenu();
        try {
            const text = exportProjectJSON(controller.getSnapshot().project);
            const done = await platform.saveExport(new TextEncoder().encode(text), 'diffusion-project.json', 'application/json');
            notice(t(done ? 'Export prepared. Unclaimed possibilities and original file bytes are not included.' : 'Export cancelled.'));
        }
        catch (error) {
            deviceFailureNotice('export', error);
        }
    }
    async function exportMarkdown() {
        closeMenu();
        try {
            const text = exportFieldMarkdown(controller.getSnapshot().project);
            const done = await platform.saveExport(new TextEncoder().encode(text), 'diffusion-field.md', 'text/markdown');
            if (done)
                feedback('export-prepared');
            else
                notice(t('Export cancelled.'));
        }
        catch (error) {
            deviceFailureNotice('export', error);
        }
    }
    async function duplicateField() {
        const departure = await departField();
        try {
            await ensureSaved();
            const source = structuredClone(controller.getSnapshot().project);
            const title = t('{title} (copy)', { title: source.title || t('Untitled') });
            const copy: typeof source = { ...source, id: id('field'), title, createdAt: Date.now(), updatedAt: Date.now(), fork: undefined };
            await repository.saveProject(copy);
            await onSwitchProject(copy.id);
            feedback('field-duplicated');
        }
        catch (error) {
            // A refused save is not a failed copy: `ensureSaved` already refused in the product's
            // own words, and saying "the copy could not be created" would blame the copy for a save
            // that never ran. The stored error is the tell, and the specific sentence stays.
            if (controller.getSnapshot().persistenceError)
                report(t('Save failed. Export the Field before changing worlds.'), 'error');
            else
                deviceFailureNotice('duplicate', error);
        }
        finally {
            departure?.revert();
            departure?.kill();
        }
    }
    /** Switching worlds stops thinking first: a response for the old Field must never land in
     * the new one. */
    async function switchField(nextId: string) {
        diffuse.stop('Switching Fields.');
        runtime.cancel();
        closeSurface(false);
        const departure = await departField();
        try {
            await onSwitchProject(nextId);
            feedback('field-opened');
        }
        catch (error) {
            deviceFailureNotice('read', error);
        }
        finally {
            departure?.revert();
            departure?.kill();
        }
    }
    async function createField(example: boolean) {
        // Creating a Field is leaving this one, so whatever place asked for it goes with it: a Help
        // panel or the Field list used to stay open on top of the Field it had just created.
        closeSurface(false);
        closeMenu();
        const departure = await departField();
        try {
            await ensureSaved();
            const next = example ? { ...demoProject(), id: id('example') } : createProject(id('field'), t('Untitled'));
            await repository.saveProject(next);
            await onSwitchProject(next.id);
            feedback('field-created');
        }
        catch (error) {
            // As with duplicateField: a refused save keeps its own sentence rather than being
            // reported as a failed creation.
            if (controller.getSnapshot().persistenceError)
                report(t('Save failed. Export the Field before changing worlds.'), 'error');
            else
                deviceFailureNotice('create', error);
        }
        finally {
            departure?.revert();
            departure?.kill();
        }
    }
    return { ensureSaved, exportCanonical, exportMarkdown, duplicateField, switchField, createField };
}
