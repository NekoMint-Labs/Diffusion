import type { ReactNode } from 'react';

/** A quiet next step inside an existing surface, without another card or illustration. */
export function SurfaceEmpty({ title, children }: { title: string; children: ReactNode }) {
    return <div className="surface-empty"><p className="surface-empty-title">{title}</p><p>{children}</p></div>;
}
