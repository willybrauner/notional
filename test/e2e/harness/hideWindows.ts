/**
 * Runs in the renderer: makes the test instance invisible without pausing it.
 * Each window turns transparent and lets clicks through (it keeps rendering,
 * so rAF, CDP input and screenshots work), the app leaves the Dock and Cmd+Tab,
 * and windows opened later (popouts) get the same treatment.
 * Serialized with toString(): no imports, no closure.
 */
export function hideWindows(): void {
	type Win = { setOpacity(o: number): void; setIgnoreMouseEvents(ignore: boolean): void };
	const remote = (window as unknown as { require(id: string): {
		app: { dock?: { hide(): void }; on(event: string, cb: (event: unknown, win: Win) => void): void };
		BrowserWindow: { getAllWindows(): Win[] };
	} }).require('@electron/remote');
	const hide = (win: Win) => {
		win.setOpacity(0);
		win.setIgnoreMouseEvents(true);
	};
	remote.BrowserWindow.getAllWindows().forEach(hide);
	remote.app.on('browser-window-created', (_event, win) => hide(win));
	remote.app.dock?.hide();
}
