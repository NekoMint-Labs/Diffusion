import { commandAvailable, selectedThoughts, type CommandContext, type DiffusionCommand } from './types.ts';

export interface ContextualAction {
    id: string;
    /** Localization source key. */
    label: string;
    /** Short explanation shown from the local strip and reusable by onboarding/action previews. */
    description: string;
    testId?: string;
}

export interface ContextualActionModel {
    primary: ContextualAction[];
    secondary: ContextualAction[];
}

const descriptor = (id: string, label: string, description: string, testId?: string): ContextualAction => ({ id, label, description, testId });

function supported(commands: DiffusionCommand[], context: CommandContext, action: ContextualAction): boolean {
    const command = commands.find(candidate => candidate.id === action.id);
    return Boolean(command && commandAvailable(command, context));
}

/** One selection -> one small, predictable intent surface.
 *
 * This is presentation policy, not a second command registry. Every id still resolves through the
 * real command registry, and unavailable commands disappear rather than becoming dead buttons.
 * Labels describe the user's intent; implementation strategy stays behind the command boundary.
 */
export function contextualActionModel(commands: DiffusionCommand[], context: CommandContext): ContextualActionModel {
    const thoughts = selectedThoughts(context);
    if (!thoughts.length) return { primary: [], secondary: [] };

    const count = thoughts.length;
    const sole = count === 1 ? thoughts[0] : null;
    const primaryCandidates: ContextualAction[] = count === 1
        ? [
            descriptor(sole?.kind === 'crystal' ? 'continue-crystal' : 'continue-thinking', 'Continue thinking', sole?.kind === 'crystal' ? 'Grow a new Thought without rewriting this Crystal.' : 'Follow the current line forward.', 'scope-continue'),
            descriptor('diffuse', 'Another angle', 'Reframe this from a different direction.', 'scope-angle'),
            descriptor('questions', 'Generate a question', 'Generate a question that could move the thinking.', 'scope-question'),
        ]
        : count === 2
            ? [
                descriptor('find-relation', 'Find a relation', 'Look for a meaningful connection without assuming one exists.', 'scope-find-relation'),
                descriptor('continue-thinking', 'Continue thinking', 'Follow the current line forward.', 'scope-continue'),
                descriptor('questions', 'Generate a question', 'Generate a question that could move the thinking.', 'scope-question'),
            ]
            : [
                descriptor('continue-thinking', 'Continue thinking', 'Follow the current line forward.', 'scope-continue'),
                descriptor('diffuse', 'Another angle', 'Reframe this from a different direction.', 'scope-angle'),
                descriptor('organize', 'Organize thoughts', 'Reveal structure that may already be present.', 'scope-organize'),
                descriptor('questions', 'Generate a question', 'Generate a question that could move the thinking.', 'scope-question'),
            ];

    const primary = primaryCandidates.filter(action => supported(commands, context, action)).slice(0, 3);
    const primaryIds = new Set(primary.map(action => action.id));

    const secondaryCandidates: ContextualAction[] = [
        descriptor('open-reference', 'View source', 'Open the reference behind this Source.'),
        descriptor('verify', 'Check evidence', 'Look for material that supports or challenges the thought.'),
        descriptor('crystallize', 'Crystallize', 'Turn the current thinking into an editable, explicit commitment.'),
        descriptor('ask', 'Ask your own question', 'Write your own question about this scope.'),
        descriptor('questions', 'Generate a question', 'Generate a question that could move the thinking.'),
        descriptor('thread', 'Open a Thought Thread', 'Open a focused place to reason with this scope.'),
        descriptor('handoff', 'Handoff into action...', 'Turn this Crystal into a practical handoff.'),
        descriptor('copy-text', 'Copy', 'Copy the selected wording.'),
        descriptor('delete', 'Delete', 'Remove the selected material from the Field.'),
    ];
    const secondary = secondaryCandidates
        .filter(action => !primaryIds.has(action.id) && supported(commands, context, action))
        .filter((action, index, all) => all.findIndex(candidate => candidate.id === action.id) === index)
        .slice(0, 6);

    return { primary, secondary };
}
