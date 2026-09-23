/** The one ordinary Select in the product.
 *
 * Before this, every preference was a native `<select>`: it renders a different control on every
 * platform, cannot be styled consistently across themes, and cannot carry the product's
 * interaction states. Base UI owns the behaviour (listbox semantics, roving highlight, typeahead,
 * `aria-activedescendant`, focus restoration to the trigger, collision-aware placement) and
 * Diffusion owns the appearance through the `ui-select-*` classes.
 *
 * It is deliberately the *only* select: no second dropdown stack, no per-surface variant.
 */
import { Select as BaseSelect } from '@base-ui/react/select';

export interface SelectOption {
    value: string;
    label: string;
}
export function Select({ value, options, onChange, ariaLabel, testId, id, popupWidth }: {
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    /** Accessible name. The visible label may be a sibling, so it is not inferred. */
    ariaLabel: string;
    testId?: string;
    id?: string;
    /** Match the popup to the trigger; a menu row list reads better than a wrapped label. */
    popupWidth?: 'trigger' | 'content';
}) {
    const items = Object.fromEntries(options.map(option => [option.value, option.label]));
    return <BaseSelect.Root items={items} value={value} onValueChange={next => onChange(String(next))}>
        <BaseSelect.Trigger id={id} data-testid={testId} data-value={value} aria-label={ariaLabel} className="ui-select-trigger">
            <BaseSelect.Value/>
            <BaseSelect.Icon className="ui-select-icon" aria-hidden="true">&#9662;</BaseSelect.Icon>
        </BaseSelect.Trigger>
        <BaseSelect.Portal>
            <BaseSelect.Positioner sideOffset={5} alignItemWithTrigger={false} className="ui-select-positioner">
                <BaseSelect.Popup className="ui-select-popup" data-width={popupWidth ?? 'content'}>
                    <BaseSelect.List className="ui-select-list">
                        {options.map(option => <BaseSelect.Item key={option.value} value={option.value} label={option.label} data-value={option.value} className="ui-select-item">
                            <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                            <BaseSelect.ItemIndicator className="ui-select-check" aria-hidden="true">&#10003;</BaseSelect.ItemIndicator>
                        </BaseSelect.Item>)}
                    </BaseSelect.List>
                </BaseSelect.Popup>
            </BaseSelect.Positioner>
        </BaseSelect.Portal>
    </BaseSelect.Root>;
}
