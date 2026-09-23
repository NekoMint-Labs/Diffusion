import { Button as BaseButton } from '@base-ui/react/button';
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

type BaseButtonProps = ComponentPropsWithoutRef<typeof BaseButton>;
export type ButtonProps = Omit<BaseButtonProps, 'className'> & {
    variant?: 'ghost' | 'outline' | 'solid';
    tone?: 'neutral' | 'attention' | 'danger';
    size?: 'sm' | 'md';
    className?: string;
};

/** The ordinary button for application chrome.
 * Base UI owns button semantics and disabled interaction. Diffusion owns density and materiality.
 * Field content deliberately does not use this component for Thoughts: a Material is not a button.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'ghost', tone = 'neutral', size = 'md', className, ...props }, ref) {
    const classes = ['ui-button', `ui-button-${variant}`, `ui-button-${tone}`, `ui-button-${size}`, className].filter(Boolean).join(' ');
    return <BaseButton {...props} ref={ref} className={classes}/>;
});
