import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';

/** Compact multi-selection / opt-in control. Use Switch for a persistent binary preference. */
export function Checkbox({ checked, onChange, label, ariaLabel, disabled, testId }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    ariaLabel?: string;
    disabled?: boolean;
    testId?: string;
}) {
    return <label className="ui-checkbox-wrap">
        <BaseCheckbox.Root className="ui-checkbox" checked={checked} onCheckedChange={onChange} aria-label={ariaLabel ?? label} disabled={disabled} data-testid={testId}>
            <BaseCheckbox.Indicator className="ui-checkbox-indicator" aria-hidden="true">&#10003;</BaseCheckbox.Indicator>
        </BaseCheckbox.Root>
        {label && <span>{label}</span>}
    </label>;
}
