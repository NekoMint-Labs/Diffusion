import { t as msg } from '../../shared/i18n.ts';
import { useState } from 'react';
import type { Region, Point } from '../../core/model.ts';
import { Surface } from './Surface.tsx';
import { Button } from '../primitives/Button.tsx';
export function RegionSurface({ region, anchor, onRename, onAsk, onCrystal, onDiffuse, onClose }: {
    region: Region;
    anchor?: Point;
    onRename: (name: string) => void;
    onAsk: () => void;
    onCrystal: () => void;
    onDiffuse: () => void;
    onClose: () => void;
}) {
    const [name, setName] = useState(region.name);
    return <Surface title={msg("A neighborhood of thought")} subtitle={msg('{count} thoughts sitting close together — grouped by position, not by meaning.', { count: region.members.length })} level="anchored" anchor={anchor} onClose={onClose}>
 <p className="muted">{msg("This is not a container. Moving a thought out does not move, bind or reorganize anything else.")}</p><form onSubmit={e => {
            e.preventDefault();
            if (name.trim())
                onRename(name);
        }}><label>{msg("Give this place a name")}<input value={name} onChange={e => setName(e.target.value)} maxLength={100}/></label><Button variant="solid" type="submit">{msg("Keep this name")}</Button></form>
 <div className="surface-choice"><Button variant="outline" onClick={onAsk}>{msg("Think with these")}</Button><Button variant="outline" onClick={onCrystal}>{msg("Crystallize this scope...")}</Button><Button variant="outline" onClick={onDiffuse}>{msg("Diffuse here...")}</Button></div>
 </Surface>;
}
