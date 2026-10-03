import { useEffect, useState } from 'react';
import { t } from '../../shared/i18n.ts';
export function HierarchyStatus({ depth, maxDepth }: { depth: number; maxDepth: number }) {
    const [open, setOpen] = useState(false);
    useEffect(() => { setOpen(true); const timer = setTimeout(() => setOpen(false), 1600); return () => clearTimeout(timer); }, [depth]);
    const label = t('Showing: {levels}', { levels: depth >= maxDepth ? t('All levels') : depth === 0 ? t('Top level') : t('Through level {level}', { level: depth + 1 }) });
    return <div className="hierarchy-disclosure" data-testid="hierarchy-disclosure" data-surface="true">
        <button type="button" aria-label={label} title={label} aria-expanded={open} onClick={() => setOpen(value => !value)}>{t('Hierarchy')}</button>
        {open && <span role="status">{label}</span>}
    </div>;
}
