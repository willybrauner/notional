import { execFileSync } from 'node:child_process';

/**
 * macOS: notes the app in front (your terminal, editor…) and returns a function
 * that brings it back to the front. Electron activates Obsidian when its window
 * opens; the test window keeps running behind (see CHROMIUM_FLAGS).
 * No Apple Events (lsappinfo, open -b), so no automation permission prompt.
 */
export function rememberFrontmostApp(): () => void {
	if (process.platform !== 'darwin') return () => undefined;
	let bundleId: string | null = null;
	try {
		const front = execFileSync('lsappinfo', ['front'], { encoding: 'utf8' }).trim();
		const info = execFileSync('lsappinfo', ['info', '-only', 'bundleid', front], { encoding: 'utf8' });
		bundleId = /"CFBundleIdentifier"="([^"]+)"/.exec(info)?.[1] ?? null;
	} catch {
		bundleId = null;
	}
	return () => {
		if (!bundleId || bundleId === 'md.obsidian') return;
		try {
			execFileSync('open', ['-b', bundleId]);
		} catch {
			// Focus is a convenience: never fail the run for it
		}
	};
}
