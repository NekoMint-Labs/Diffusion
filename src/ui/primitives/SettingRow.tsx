import type { ReactNode } from 'react';

/** Canonical settings/control row: one decision, one explanation, one control edge. */
export function SettingRow({ label, description, children, setting, className }: {
    label: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    setting?: string;
    className?: string;
}) {
    return <div className={`ui-setting-row${className ? ` ${className}` : ''}`} data-setting={setting}>
        <div className="ui-setting-copy">
            <span className="ui-setting-label">{label}</span>
            {description && <span className="ui-setting-description">{description}</span>}
        </div>
        <div className="ui-setting-control">{children}</div>
    </div>;
}
