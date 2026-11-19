// Minimal runtime stand-in for the `obsidian` module (aliased in vitest.config.ts).
// Only what the tested pure functions use at runtime; extend it when a test needs more.
import momentLib from 'moment';

export const moment = momentLib;

export function normalizePath(path: string): string {
	return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
}

export function parseYaml(text: string): unknown {
	return JSON.parse(text);
}

export function parsePropertyId(id: string): { type: string; name: string } {
	const dot = id.indexOf('.');
	return dot < 0 ? { type: 'note', name: id } : { type: id.slice(0, dot), name: id.slice(dot + 1) };
}

export const Platform = { isDesktopApp: true, isMobile: false };

/** Scalar Bases value. */
export class Value {
	constructor(private readonly raw: unknown) {}
	isTruthy(): boolean {
		return this.raw !== null && this.raw !== undefined && this.raw !== '' && this.raw !== false;
	}
	toString(): string {
		return String(this.raw);
	}
}

/** List Bases value (tags, multitext). */
export class ListValue extends Value {
	constructor(private readonly items: Value[]) {
		super(items);
	}
	length(): number {
		return this.items.length;
	}
	get(index: number): Value {
		const item = this.items[index];
		if (!item) throw new Error(`No item at ${index}`);
		return item;
	}
	isTruthy(): boolean {
		return this.items.length > 0;
	}
}

export class TAbstractFile {
	path = '';
	name = '';
}

export class TFile extends TAbstractFile {
	basename = '';
	extension = '';
}

export class TFolder extends TAbstractFile {}

/** Same lifecycle as Obsidian's Component (children unloaded first, cleanups last-in first-out). */
export class Component {
	private _loaded = false;
	private _events: (() => void)[] = [];
	private _children: Component[] = [];

	load(): void {
		if (this._loaded) return;
		this._loaded = true;
		this.onload();
		for (const child of this._children.slice()) child.load();
	}
	onload(): void {}
	unload(): void {
		if (!this._loaded) return;
		this._loaded = false;
		while (this._children.length > 0) this._children.pop()?.unload();
		while (this._events.length > 0) this._events.pop()?.();
		this.onunload();
	}
	onunload(): void {}
	addChild<T extends Component>(child: T): T {
		this._children.push(child);
		if (this._loaded) child.load();
		return child;
	}
	removeChild<T extends Component>(child: T): T {
		const index = this._children.indexOf(child);
		if (index !== -1) {
			this._children.splice(index, 1);
			child.unload();
		}
		return child;
	}
	register(cb: () => void): void {
		this._events.push(cb);
	}
	registerEvent(ref: { off: () => void }): void {
		this.register(() => ref.off());
	}
	registerDomEvent(el: EventTarget, type: string, cb: EventListener, options?: boolean | AddEventListenerOptions): void {
		el.addEventListener(type, cb, options);
		this.register(() => el.removeEventListener(type, cb, options));
	}
	registerInterval(id: number): number {
		this.register(() => clearInterval(id));
		return id;
	}
}

/** Plugin APIs end with this.register(cleanup), like Obsidian's. */
export class Plugin extends Component {
	readonly commands = new Set<string>();
	constructor(public app: unknown = {}, public manifest = { id: 'notionalize', name: 'Notionalize' }) {
		super();
	}
	addCommand(command: { id: string }): { id: string } {
		const id = `${this.manifest.id}:${command.id}`;
		this.commands.add(id);
		this.register(() => this.commands.delete(id));
		return command;
	}
	loadData(): Promise<unknown> {
		return Promise.resolve(null);
	}
	saveData(_data: unknown): Promise<void> {
		return Promise.resolve();
	}
}

// Imported by src/settings/; tests never render the tab
export class PluginSettingTab {}
export class Setting {}

// Extended by feature classes, so importing the registry loads; tests never build them
export class AbstractInputSuggest {}
export class BasesView {}
export class EditorSuggest {}
export class FuzzySuggestModal {}
export class Modal {}
export class View {}
export function requestUrl(): Promise<never> {
	return Promise.reject(new Error('No network in unit tests'));
}
