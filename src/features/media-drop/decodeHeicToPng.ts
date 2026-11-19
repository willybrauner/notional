import { Platform } from 'obsidian';

/**
 * child_process/fs/os/path are Node builtins, externalized by esbuild
 * (scripts/build.ts). They are imported dynamically inside the desktop guard:
 * a top-level import would throw at plugin load time on mobile.
 *
 * sips is macOS-only (same approach as the to-webp CLI script). A pasted
 * file has no path on disk, so the source is always spooled to a temp file
 * first rather than relying on `file.path`.
 */
export async function decodeHeicToPng(file: File): Promise<Blob> {
	if (Platform.isDesktopApp && process.platform === 'darwin') {
		const { execFileSync } = await import('child_process');
		const fs = await import('fs');
		const os = await import('os');
		const path = await import('path');

		const tempIn = path.join(os.tmpdir(), `notional-${Date.now()}.heic`);
		const tempOut = `${tempIn}.png`;

		try {
			fs.writeFileSync(tempIn, Buffer.from(await file.arrayBuffer()));
			execFileSync('sips', ['-s', 'format', 'png', tempIn, '--out', tempOut], { stdio: 'pipe' });
			return new Blob([Uint8Array.from(fs.readFileSync(tempOut))], { type: 'image/png' });
		} finally {
			for (const p of [tempIn, tempOut]) {
				if (fs.existsSync(p)) fs.unlinkSync(p);
			}
		}
	}
	throw new Error('HEIC conversion requires macOS desktop');
}
