import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CdpClient } from './CdpClient';
import { hideWindows } from './hideWindows';
import { rememberFrontmostApp } from './rememberFrontmostApp';
import {
	CDP_PORT, CHROMIUM_FLAGS, DIST_DIR, FIXTURE_VAULT, MIN_APP_VERSION, OBSIDIAN_BIN, OFF_BY_DEFAULT,
	HOME_DIR, RUN_DIR, SHOW_WINDOW, TIMEOUTS, USER_DATA_DIR, VAULT_ID, WINDOW_SIZE,
} from './constants';
import { DATA_VERSION } from '../../../src/core/constants';

export interface LaunchOptions {
	// Vault copied fresh for the run (default: the e2e fixture vault)
	fixtureVault?: string;
	// Notionalize's data.json in that copy (default: every feature on)
	pluginData?: Record<string, unknown>;
	windowSize?: { width: number; height: number };
}

// Every feature on, those off by default too, so every spec finds them running
const E2E_PLUGIN_DATA = {
	version: DATA_VERSION,
	settings: { convertImagesToWebp: true, features: Object.fromEntries(OFF_BY_DEFAULT.map(id => [id, true])) },
};

export interface LaunchedObsidian {
	// WebSocket debugger URL of the main window
	pageUrl: string;
	vaultPath: string;
	close: () => Promise<void>;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const cdpUrl = (route: string) => `http://127.0.0.1:${CDP_PORT}${route}`;

/** Fresh copy of the fixture vault with the current build installed and enabled. */
function prepareVault(fixtureVault: string, pluginData: Record<string, unknown>): string {
	fs.rmSync(RUN_DIR, { recursive: true, force: true });
	const vaultPath = path.join(RUN_DIR, 'vault');
	fs.cpSync(fixtureVault, vaultPath, { recursive: true });

	const pluginDir = path.join(vaultPath, '.obsidian/plugins/notionalize');
	fs.mkdirSync(pluginDir, { recursive: true });
	for (const file of ['main.js', 'styles.css', 'manifest.json']) {
		const source = path.join(DIST_DIR, file);
		if (!fs.existsSync(source)) throw new Error(`Missing ${source}: run \`pnpm build\` first`);
		fs.copyFileSync(source, path.join(pluginDir, file));
	}
	fs.writeFileSync(path.join(pluginDir, 'data.json'), JSON.stringify(pluginData));
	fs.writeFileSync(path.join(vaultPath, '.obsidian/community-plugins.json'), JSON.stringify(['notionalize']));
	return vaultPath;
}

/** Points the test profile at the vault so Obsidian opens it directly. */
function prepareProfile(vaultPath: string): void {
	fs.mkdirSync(USER_DATA_DIR, { recursive: true });
	const config = { vaults: { [VAULT_ID]: { path: vaultPath, ts: Date.now(), open: true } } };
	fs.writeFileSync(path.join(USER_DATA_DIR, 'obsidian.json'), JSON.stringify(config));
}

async function waitUntil(check: () => Promise<boolean>, timeout: number, what: string): Promise<void> {
	const end = Date.now() + timeout;
	while (Date.now() < end) {
		if (await check().catch(() => false)) return;
		await sleep(250);
	}
	throw new Error(`Timed out waiting for ${what}`);
}

async function findPageUrl(): Promise<string | null> {
	const targets = await (await fetch(cdpUrl('/json/list'))).json() as { type: string; url: string; webSocketDebuggerUrl: string }[];
	return targets.find(t => t.type === 'page' && t.url.startsWith('app://obsidian.md/index.html'))?.webSocketDebuggerUrl ?? null;
}

/** App version shown in the window title ("… - Obsidian 1.15.1"), once the vault is loaded. */
async function readAppVersion(pageUrl: string): Promise<number[] | null> {
	const client = await CdpClient.connect(pageUrl);
	try {
		const { result } = await client.send<{ result: { value?: string } }>('Runtime.evaluate', {
			expression: `window.app?.workspace?.layoutReady ? document.title : ''`,
			returnByValue: true,
		});
		const match = /Obsidian v?(\d+)\.(\d+)/.exec(result.value ?? '');
		return match ? [Number(match[1]), Number(match[2])] : null;
	} finally {
		client.close();
	}
}

/**
 * Answers the "Do you trust the author of this vault?" prompt shown for a new
 * vault with community plugins (the test vault, built by prepareVault), then
 * waits for Notionalize to be loaded.
 */
async function trustVaultAndWaitForPlugin(pageUrl: string): Promise<void> {
	const client = await CdpClient.connect(pageUrl);
	const evaluate = async (expression: string) =>
		(await client.send<{ result: { value?: unknown } }>('Runtime.evaluate', { expression, returnByValue: true })).result.value;
	try {
		await waitUntil(async () => Boolean(await evaluate(`(() => {
			if (window.app?.plugins?.plugins?.notionalize) return true;
			const trust = Array.from(document.querySelectorAll('.modal button')).find(b => /trust author/i.test(b.textContent));
			trust?.click();
			return false;
		})()`)), TIMEOUTS.launch, 'the Notionalize plugin to load');
	} finally {
		client.close();
	}
}

/**
 * Same window size on every machine, wide enough for Bases tables. Electron's
 * CDP has no Browser.setWindowBounds: the window is resized from the renderer.
 */
async function resizeWindow(pageUrl: string, size: { width: number; height: number }): Promise<void> {
	const client = await CdpClient.connect(pageUrl);
	try {
		// Zoom back to 100%: the profile keeps the zoom of the last run (another session may have zoomed in)
		await client.send('Runtime.evaluate', {
			expression: `require('electron').webFrame.setZoomFactor(1); require('@electron/remote').getCurrentWindow().setBounds({ x: 0, y: 0, ...${JSON.stringify(size)} })`,
		});
		await waitUntil(async () => {
			const { result } = await client.send<{ result: { value?: number } }>('Runtime.evaluate', { expression: 'innerWidth', returnByValue: true });
			return result.value === size.width;
		}, TIMEOUTS.launch, 'the window to resize');
	} finally {
		client.close();
	}
}

/** Hides the test windows as soon as the first one is up (see hideWindows). */
async function hide(pageUrl: string): Promise<void> {
	if (SHOW_WINDOW) return;
	const client = await CdpClient.connect(pageUrl);
	try {
		await client.send('Runtime.evaluate', { expression: `(${hideWindows.toString()})()` });
	} finally {
		client.close();
	}
}

const isOlder = (version: number[], min: number[]) =>
	(version[0] ?? 0) < (min[0] ?? 0) || ((version[0] ?? 0) === (min[0] ?? 0) && (version[1] ?? 0) < (min[1] ?? 0));

async function start(): Promise<string> {
	fs.mkdirSync(HOME_DIR, { recursive: true });
	const child = spawn(OBSIDIAN_BIN, [`--user-data-dir=${USER_DATA_DIR}`, `--remote-debugging-port=${CDP_PORT}`, ...CHROMIUM_FLAGS], {
		stdio: 'ignore',
		env: { ...process.env, HOME: HOME_DIR },
	});
	child.unref();
	let pageUrl: string | null = null;
	await waitUntil(async () => (pageUrl = await findPageUrl()) !== null, TIMEOUTS.launch, 'the Obsidian window');
	await hide(pageUrl as unknown as string);
	return pageUrl as unknown as string;
}

/** Graceful quit: lets Obsidian save its state, like closing the window. */
async function quit(): Promise<void> {
	const { webSocketDebuggerUrl } = await (await fetch(cdpUrl('/json/version'))).json() as { webSocketDebuggerUrl: string };
	const browser = await CdpClient.connect(webSocketDebuggerUrl);
	void browser.send('Browser.close').catch(() => undefined);
	await waitUntil(async () => !(await fetch(cdpUrl('/json/version')).then(() => true, () => false)), TIMEOUTS.launch, 'Obsidian to quit');
}

/**
 * Launches an isolated Obsidian (own profile, own vault copy) with the
 * DevTools protocol enabled, hidden from your screen. A profile still on the installer's app version
 * waits for the auto-update to download, then relaunches on it.
 */
export async function launchObsidian(options: LaunchOptions = {}): Promise<LaunchedObsidian> {
	const alreadyRunning = await fetch(cdpUrl('/json/version')).then(() => true, () => false);
	if (alreadyRunning) throw new Error(`Port ${CDP_PORT} is busy: close the previous test instance first`);

	const vaultPath = prepareVault(options.fixtureVault ?? FIXTURE_VAULT, options.pluginData ?? E2E_PLUGIN_DATA);
	prepareProfile(vaultPath);
	// Give the focus back to the app you were using as soon as the window is up
	const restoreFocus = rememberFrontmostApp();

	let pageUrl = await start();
	restoreFocus();
	let version: number[] | null = null;
	await waitUntil(async () => (version = await readAppVersion(pageUrl)) !== null, TIMEOUTS.launch, 'the vault to load');

	if (version && isOlder(version, MIN_APP_VERSION)) {
		const hasUpdate = () => fs.readdirSync(USER_DATA_DIR).some(f => /^obsidian-[\d.]+\.asar$/.test(f));
		await waitUntil(async () => hasUpdate(), TIMEOUTS.update, 'the Obsidian app update to download');
		await quit();
		pageUrl = await start();
		restoreFocus();
		await waitUntil(async () => (version = await readAppVersion(pageUrl)) !== null, TIMEOUTS.launch, 'the vault to load');
		if (version && isOlder(version, MIN_APP_VERSION)) throw new Error(`Obsidian ${String(version)} is older than ${String(MIN_APP_VERSION)}`);
	}

	await trustVaultAndWaitForPlugin(pageUrl);
	await resizeWindow(pageUrl, options.windowSize ?? WINDOW_SIZE);
	// Opening the vault can bring the window forward again
	restoreFocus();
	return { pageUrl, vaultPath, close: quit };
}
