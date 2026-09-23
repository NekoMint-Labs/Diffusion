import { Switch as BaseSwitch } from '@base-ui/react/switch';

/** The ordinary binary control.
 *
 * The label beside the track is optional because Settings rows already name the preference.
 * Base UI owns keyboard/ARIA state; the visual track is shared everywhere through primitives.css.
 */
export function Switch({ checked, onChange, label, ariaLabel, testId, disabled }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    ariaLabel: string;
    testId?: string;
    disabled?: boolean;
}) {
    return <span className="ui-switch-wrap">
        <BaseSwitch.Root className="ui-switch" checked={checked} onCheckedChange={onChange} aria-label={ariaLabel} data-testid={testId} disabled={disabled}>
            <BaseSwitch.Thumb className="ui-switch-thumb"/>
        </BaseSwitch.Root>
        {label && <span className="ui-switch-label" aria-hidden="true">{label}</span>}
    </span>;
}
