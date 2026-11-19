import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const DIST_DIR = path.join(PROJECT_ROOT, 'dist');
// Fixture vault, copied fresh for every run (tests never modify it)
export const FIXTURE_VAULT = path.join(PROJECT_ROOT, 'test/e2e/vault');

// Obsidian binary: override with OBSIDIAN_BIN (e.g. on Linux)
export const OBSIDIAN_BIN = process.env.OBSIDIAN_BIN ?? '/Applications/Obsidian.app/Contents/MacOS/Obsidian';
export const CDP_PORT = Number(process.env.NOTIONAL_E2E_PORT ?? 9333);

// Own Obsidian profile, never the user's: kept between runs so the app update
// downloaded on the first launch is reused (fresh profiles start on the installer version)
export const USER_DATA_DIR = path.join(PROJECT_ROOT, 'test/e2e/.cache/userdata');
// Own HOME: Obsidian opens its CLI socket at ~/.obsidian-cli.sock on launch and
// removes it on quit, which would cut the `obsidian` CLI off the user's app.
// The login keychain is under the real HOME: see --use-mock-keychain below
export const HOME_DIR = path.join(PROJECT_ROOT, 'test/e2e/.cache/home');
// Vault copy and failure screenshots of the last run
export const RUN_DIR = path.join(PROJECT_ROOT, 'test/e2e/.run');
export const VAULT_ID = 'notionale2evault';

// Features off by default, turned on for the specs (defaults.test.ts keeps the list in sync)
export const OFF_BY_DEFAULT = [
	'hide-base-extension', 'prettier', 'base-own-context',
	'tweak-accent', 'tweak-dark-background', 'tweak-typography', 'tweak-tabs', 'tweak-properties', 'tweak-bases-layout',
];

// Bases views (board, timeline) need Obsidian 1.10+
export const MIN_APP_VERSION = [1, 10];

// Keep timers and requestAnimationFrame running when the window is in the background
export const CHROMIUM_FLAGS = [
	'--disable-renderer-backgrounding',
	'--disable-background-timer-throttling',
	'--disable-backgrounding-occluded-windows',
	// Safe storage in memory: the login keychain can't be found under HOME_DIR,
	// and the test profile must not touch it anyway
	'--use-mock-keychain',
];

// The test windows are invisible (see hideWindows) unless you want to watch
// the run, or keep the instance open to inspect it
export const SHOW_WINDOW = Boolean(process.env.NOTIONAL_E2E_SHOW || process.env.NOTIONAL_E2E_KEEP_OPEN);

export const WINDOW_SIZE = { width: 1600, height: 1000 };

export const TIMEOUTS = {
	launch: 30_000,
	update: 60_000,
	waitFor: 5_000,
};
