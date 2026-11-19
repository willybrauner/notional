// Below this width, a touch device gets the mobile pickers (bottom sheets)
const MOBILE_BREAKPOINT_PX = 768;

/** A phone-sized touch screen: pickers open as bottom sheets. */
export function isMobile(): boolean {
	return navigator.maxTouchPoints > 0 && window.innerWidth < MOBILE_BREAKPOINT_PX;
}
