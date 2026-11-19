// =============================================================================
// ICONS SERVICE - Store, always loaded (icons, title mentions, board, timeline…)
// Saving + resolving (direct icon, else the default of the extension)
// =============================================================================

import { App, Component, TFile } from 'obsidian';
import { IconConfig, IconSettings, ResolvedIconConfig } from '../../features/icons/types';
import { defaultIconForPath } from '../../features/icons/constants';
import type { DataStore } from '../../core/DataStore';

const RECENT_MAX = 24;

const URL_PROPS = ['url', 'URL', 'website', 'Website'];

export class IconStore extends Component {
	private app: App;
	private data: DataStore;
	private settings: IconSettings = {};
	private recent: string[] = [];
	private listeners = new Set<() => void>();
	// Set by the icons feature while it runs: features rendering note icons skip them otherwise
	private _shown = false;

	// The DataStore is loaded: icons resolve before any feature renders one
	constructor(app: App, data: DataStore) {
		super();
		this.app = app;
		this.data = data;
		this.settings = data.read<IconSettings>('icons') ?? {};
		this.recent = data.read<string[]>('recentIcons') ?? [];
	}

	// Keeps the stored paths in sync with the vault, whether the icons feature runs or not
	onload() {
		this.registerEvent(
			this.app.vault.on('rename', (file, oldPath) => {
				if (file instanceof TFile) void this.rename(oldPath, file.path);
			})
		);
		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				if (file instanceof TFile) void this.remove(file.path);
			})
		);
	}

	/** Subscribes to icon changes (set/remove/rename, shown or hidden). Returns an unsubscribe function. */
	onChange(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	get shown(): boolean {
		return this._shown;
	}

	/** Shows or hides the note icons everywhere (icons feature turned on or off), listeners re-render. */
	setShown(shown: boolean): void {
		if (this._shown === shown) return;
		this._shown = shown;
		this.listeners.forEach(listener => listener());
	}

	private async save(): Promise<void> {
		await this.data.write({ icons: this.settings, recentIcons: this.recent });
		this.notify();
	}

	/** Listeners re-render: also called when an icon pack is added or removed. */
	notify(): void {
		this.listeners.forEach(listener => listener());
	}

	/** Direct (custom) icon saved for the path, or null. */
	get(filePath: string): IconConfig | null {
		return this.settings[filePath] ?? null;
	}

	/** Recently used icons (names, most recent first). */
	getRecent(): string[] {
		return this.recent;
	}

	async set(filePath: string, config: IconConfig): Promise<void> {
		this.settings[filePath] = config;
		this.pushRecent(config.icon);
		await this.save();
	}

	private pushRecent(iconName: string): void {
		this.recent = [iconName, ...this.recent.filter(n => n !== iconName)].slice(0, RECENT_MAX);
	}

	async remove(filePath: string): Promise<void> {
		delete this.settings[filePath];
		await this.save();
	}

	/** Moves the key after a file rename or move. */
	async rename(oldPath: string, newPath: string): Promise<void> {
		const config = this.settings[oldPath];
		if (!config) return;
		delete this.settings[oldPath];
		this.settings[newPath] = config;
		await this.save();
	}

	/** Website icons are on (googleFavicons setting): each one is fetched from Google. */
	get faviconsEnabled(): boolean {
		return this.data.settings.googleFavicons;
	}

	/** Favicon from a url/website frontmatter property, or null (also when favicons are off). */
	getFaviconConfig(filePath: string): IconConfig | null {
		if (!this.faviconsEnabled) return null;
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) return null;
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
		if (!fm) return null;

		// 1. Priority props (cast each value to unknown so type predicates work despite fm's any index signature)
		const priority = URL_PROPS.map(k => fm[k] as unknown).find((v): v is string => typeof v === 'string' && !!v.trim());
		// 2. Fallback: first https:// value in any other property
		const fallback: string | undefined = priority == null
			? (Object.values(fm) as unknown[])
				.find((v): v is string => typeof v === 'string' && v.trimStart().startsWith('https://'))
			: undefined;

		const raw: string | undefined = priority ?? fallback;
		if (!raw) return null;
		try {
			const { hostname } = new URL(raw.trim());
			if (!hostname) return null;
			return { icon: `favicon:${hostname}`, color: 'default' };
		} catch {
			return null;
		}
	}

	/** Whether a markdown file has content beyond its metadata. */
	hasContent(filePath: string): boolean {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		// Missing, or not a file → no content
		if (!(file instanceof TFile)) return false;
		if (!filePath.endsWith('.md')) return true;

		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache) return false;

		// Structured content
		const headings = cache.headings?.length ?? 0;
		const lists = cache.listItems?.length ?? 0;
		const links = cache.links?.length ?? 0;
		const sections = cache.sections?.length ?? 0;

		return headings > 0 || lists > 0 || links > 0 || sections > 1; // sections > 1: one section always exists
	}

	/** Direct icon, else the favicon of a url/website property, else the default of the extension. */
	resolve(filePath: string): ResolvedIconConfig {
		const direct = this.settings[filePath];
		if (direct) return { ...direct, source: 'direct' };
		const favicon = this.getFaviconConfig(filePath);
		if (favicon) return { ...favicon, source: 'favicon' };

		const defaultIcon = defaultIconForPath(filePath);
		if (defaultIcon === 'file' && !this.hasContent(filePath)) {
			return { icon: 'file-empty', color: 'default', source: 'default' };
		}
		return { icon: defaultIcon, color: 'default', source: 'default' };
	}
}
