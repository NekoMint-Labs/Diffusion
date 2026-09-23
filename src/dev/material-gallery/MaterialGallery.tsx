/** Development-only material comparison route. It owns no canonical or persisted state. */
import { useEffect, useState } from 'react';
import { MaterialBackground } from './MaterialBackground.tsx';
import { ThoughtComparison } from './ThoughtComparison.tsx';
import { MATERIAL_IDS, MATERIALS, type GalleryTheme, type MaterialId } from './types.ts';
import './materialGallery.css';

const TEXT = {
    eyebrow: 'Diffusion · development only', title: 'Material gallery',
    lead: 'Six sourced backgrounds against the same Field vocabulary. Nothing here changes Appearance settings.',
    background: 'Background', theme: 'Theme', paper: 'Paper', graphite: 'Graphite',
    presence: 'Background presence', motion: 'Motion', detail: 'Scale / density',
    reduced: 'OS reduced motion is active; renderer motion is forced to 0.',
    stage: 'Field material comparison', field: 'FIELD', fieldName: 'Unfinished connections',
};

export default function MaterialGallery() {
    const [material, setMaterial] = useState<MaterialId>('paper');
    const [theme, setTheme] = useState<GalleryTheme>('paper');
    const [presence, setPresence] = useState(42);
    const [motion, setMotion] = useState(0);
    const [detail, setDetail] = useState(42);
    const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
    useEffect(() => {
        const media = matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(media.matches);
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);
    const effectiveMotion = reduced ? 0 : motion;
    const meta = MATERIALS[material];
    return <main className="material-gallery" data-theme={theme}>
        <aside className="material-gallery-controls">
            <header className="material-gallery-header">
                <span className="material-gallery-eyebrow">{TEXT.eyebrow}</span>
                <h1>{TEXT.title}</h1><p>{TEXT.lead}</p>
            </header>
            <section aria-labelledby="gallery-background-heading">
                <h2 id="gallery-background-heading">{TEXT.background}</h2>
                <div className="material-gallery-options">
                    {MATERIAL_IDS.map(id => <button key={id} type="button" data-active={material === id || undefined}
                        aria-pressed={material === id} onClick={() => setMaterial(id)}>{MATERIALS[id].label}</button>)}
                </div>
            </section>
            <section aria-labelledby="gallery-theme-heading">
                <h2 id="gallery-theme-heading">{TEXT.theme}</h2>
                <div className="material-gallery-segmented">
                    {(['paper', 'graphite'] as const).map(value => <button key={value} type="button"
                        data-active={theme === value || undefined} aria-pressed={theme === value}
                        onClick={() => setTheme(value)}>{value === 'paper' ? TEXT.paper : TEXT.graphite}</button>)}
                </div>
            </section>
            <section className="material-gallery-sliders" aria-label={TEXT.stage}>
                <GalleryRange label={TEXT.presence} value={presence} onChange={setPresence}/>
                <GalleryRange label={TEXT.motion} value={motion} onChange={setMotion}/>
                <GalleryRange label={TEXT.detail} value={detail} onChange={setDetail}/>
                {reduced && <p className="material-gallery-reduced">{TEXT.reduced}</p>}
            </section>
            <dl className="material-gallery-meta">
                <div><dt>{meta.source}</dt><dd>{meta.renderer}</dd></div><div><dt>{meta.cost}</dt><dd>{`${effectiveMotion}% motion`}</dd></div>
            </dl>
        </aside>
        <section className="material-gallery-stage" aria-label={TEXT.stage} data-testid="material-gallery-stage">
            <div className="material-gallery-background" style={{ opacity: presence / 100 }} aria-hidden="true">
                <MaterialBackground id={material} theme={theme} motion={effectiveMotion} detail={detail}/>
            </div>
            <div className="material-gallery-identity"><span>{TEXT.field}</span><strong>{TEXT.fieldName}</strong></div>
            <ThoughtComparison/>
        </section>
    </main>;
}

function GalleryRange({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
    return <label><span>{label}</span><output>{value}</output>
        <input type="range" min="0" max="100" value={value} aria-label={label}
            onChange={event => onChange(Number(event.currentTarget.value))}/></label>;
}
