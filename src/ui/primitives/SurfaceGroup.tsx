import type { ReactNode } from 'react';

/** A compact group of related controls inside a Surface.
 * This is structure, not a dashboard card: groups use one quiet perimeter and internal dividers.
 */
export function SurfaceGroup({ title, description, children, className }: {
    title?: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return <section className={`ui-surface-group${className ? ` ${className}` : ''}`}>
        {(title || description) && <header className="ui-surface-group-heading">
            {title && <h4>{title}</h4>}
            {description && <p>{description}</p>}
        </header>}
        <div className="ui-surface-group-content">{children}</div>
    </section>;
}
