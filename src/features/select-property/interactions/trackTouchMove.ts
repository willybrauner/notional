import type { PointerState } from '../types';

// Movement (px) after which a touch is a scroll, not a tap
const TAP_SLOP_PX = 8;

/** Marks the touch in progress as moved once it went past the tap slop. */
export function trackTouchMove(e: TouchEvent, state: PointerState): void {
	if (!state.touchStartEl || !e.touches[0]) return;
	const dx = Math.abs(e.touches[0].clientX - state.touchStartX);
	const dy = Math.abs(e.touches[0].clientY - state.touchStartY);
	if (dx > TAP_SLOP_PX || dy > TAP_SLOP_PX) state.touchMoved = true;
}
