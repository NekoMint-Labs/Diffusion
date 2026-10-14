import { describe, expect, it } from 'vitest';
import { insideSubmenuTravel } from '../../src/ui/focus/submenuTravel.ts';

describe('bounded submenu travel', () => {
    const trigger = { left: 727, right: 944, top: 582, bottom: 614 };
    const popup = { left: 947, right: 1171, top: 582, bottom: 891 };
    it('retains the reported diagonal departure below the trigger', () => {
        expect(insideSubmenuTravel({ x: 863, y: 625 }, trigger, popup)).toBe(true);
        expect(insideSubmenuTravel({ x: 946, y: 700 }, trigger, popup)).toBe(true);
        expect(insideSubmenuTravel({ x: 1000, y: 700 }, trigger, popup)).toBe(true);
    });
    it('works when viewport collision flips the popup left', () => {
        const flip = (rect: typeof trigger) => ({ ...rect, left: -rect.right, right: -rect.left });
        expect(insideSubmenuTravel({ x: -863, y: 625 }, flip(trigger), flip(popup))).toBe(true);
    });
    it('excludes other rows and the Field outside the narrow travel corridor', () => {
        expect(insideSubmenuTravel({ x: 863, y: 500 }, trigger, popup)).toBe(false);
        expect(insideSubmenuTravel({ x: 700, y: 625 }, trigger, popup)).toBe(false);
        expect(insideSubmenuTravel({ x: 863, y: 950 }, trigger, popup)).toBe(false);
    });
});
