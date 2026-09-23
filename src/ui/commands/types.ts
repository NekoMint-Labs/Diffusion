import type { Point, ProjectState, Thought } from '../../core/model.ts';
import type { Surface } from '../transient.ts';
/** One semantic action, many presentations. A definition never renders and never reads the DOM. */
export type CommandGroup = 'think' | 'field' | 'edit' | 'find' | 'view' | 'app';
/** Platform-neutral shortcut description; labels are rendered per platform. */
export interface Shortcut {
    key: string;
    /** Command on macOS, Control elsewhere. */
    mod?: boolean;
    shift?: boolean;
    alt?: boolean;
}
/** Explicit invocation context. Commands receive what they act on, never ambient UI geometry. */
export interface CommandContext {
    project: ProjectState;
    selection: string[];
    editing: string | null;
    surface: Surface;
    canUndo: boolean;
    canRedo: boolean;
}
export interface DiffusionCommand {
    id: string;
    group: CommandGroup;
    /** Localization source key. Never pre-translated. */
    label: string;
    /** Extra discovery terms: English aliases for the Chinese UI, internal names. */
    keywords?: string[];
    shortcuts?: Shortcut[];
    /** Invocable while another transient owner or a text editor already owns input. */
    global?: boolean;
    /** Contextual availability. Unavailable commands are absent from every presentation. */
    available?: (context: CommandContext) => boolean;
    run: (context: CommandContext, origin?: Point) => void;
}
/** Capabilities every presentation needs from its composition root. */
export interface SurfaceDeps {
    openSurface: (surface: Surface, origin?: Point) => void;
}
export const commandAvailable = (command: DiffusionCommand, context: CommandContext): boolean =>
    command.available ? command.available(context) : true;
/** Selected Thoughts that still exist, in selection order. */
export const selectedThoughts = (context: CommandContext): Thought[] =>
    context.selection.map(key => context.project.thoughts[key]).filter((thought): thought is Thought => Boolean(thought));
export const selectedIds = (context: CommandContext): string[] => selectedThoughts(context).map(thought => thought.id);
