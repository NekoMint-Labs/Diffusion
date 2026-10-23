import { t as msg } from './shared/i18n.ts';
import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App.tsx';
import './ui/theme.css';
class ErrorBoundary extends React.Component<{
    children: React.ReactNode;
}, {
    error: string | null;
}> {
    state: {
        error: string | null;
    } = { error: null };
    static getDerivedStateFromError(error: Error) { return { error: error.message }; }
    render() { return this.state.error ? <main style={{ padding: 40 }}><h1>{msg('The Field could not open.')}</h1><p>{this.state.error}</p><p>{msg('Local data has not been cleared. Reload to retry; do not clear browser storage before exporting.')}</p><button onClick={() => location.reload()}>{msg('Reload')}</button></main> : this.props.children; }
}
/* Development-only design environment. Guarded by import.meta.env.DEV so the dynamic import is
   unreachable and tree-shaken out of a production bundle; the route never exists in production. */
const MotionLab = import.meta.env.DEV ? lazy(() => import('./dev/MotionLab.tsx')) : null;
const MaterialGallery = import.meta.env.DEV ? lazy(() => import('./dev/material-gallery/MaterialGallery.tsx')) : null;
// Opt-in Next experiment: independent notebook and no automatic provider requests.
const ExplorationTrial = lazy(() => import('./next/ExplorationTrial.tsx'));
const root = document.getElementById('root')!;
if (location.pathname === '/next/explore')
    createRoot(root).render(<ErrorBoundary><Suspense fallback={null}><ExplorationTrial /></Suspense></ErrorBoundary>);
else if (MaterialGallery && location.pathname === '/dev/material-gallery')
    createRoot(root).render(<Suspense fallback={null}><MaterialGallery /></Suspense>);
else if (MotionLab && location.pathname === '/dev/motion')
    createRoot(root).render(<Suspense fallback={null}><MotionLab /></Suspense>);
else
    createRoot(root).render(<ErrorBoundary><App /></ErrorBoundary>);
