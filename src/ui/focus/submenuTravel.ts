import type { Point } from '../../core/model.ts';

type Rect = { left: number; right: number; top: number; bottom: number };
/** A bounded corridor for diagonal travel into a tall, collision-flipped submenu. */
export function insideSubmenuTravel(point: Point, trigger: Rect, popup: Rect): boolean {
    const inside = (rect: Rect) => point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
    if (inside(trigger) || inside(popup)) return true;
    const right = popup.left >= trigger.right;
    const left = popup.right <= trigger.left;
    if (!right && !left) return false;
    const start = right ? trigger.left : trigger.right;
    const end = right ? popup.left : popup.right;
    const fraction = (point.x - start) / (end - start);
    if (fraction < 0 || fraction > 1) return false;
    const top = trigger.top + (popup.top - trigger.top) * fraction;
    const bottom = trigger.bottom + (popup.bottom - trigger.bottom) * fraction;
    return point.y >= top && point.y <= bottom;
}
