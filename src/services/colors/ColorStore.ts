import type { DataStore } from '../../core/DataStore';
import { getColor } from './getColor';
import { STORAGE_KEY } from './constants';
import { isNotionColor, readColorMap } from './readColorMap';

// value: the changed value, or null when the whole map was (re)loaded
export type ColorListener = (value: string | null, color: string | null) => void;

/**
 * Single source of the value → Notion color map, shared by select chips, tags
 * and board columns. Keys are lowercased values (tags without '#'). The map
 * object is never replaced, so features can keep a reference to it.
 */
export class ColorStore {
	readonly map: Record<string, string>;
	private data: DataStore;
	private listeners = new Set<ColorListener>();

	// The DataStore is loaded: the map is ready before any feature renders a chip
	constructor(data: DataStore) {
		this.data = data;
		this.map = readColorMap(data.read<unknown>(STORAGE_KEY));
	}

	get(value: string): string | null {
		return getColor(this.map, value);
	}

	async set(value: string, color: string | null): Promise<void> {
		const key = value.toLowerCase();
		if (color && !isNotionColor(color)) return;
		if (color) this.map[key] = color;
		else delete this.map[key];
		this.emit(value, color);
		await this.data.write({ [STORAGE_KEY]: this.map });
	}

	/** Subscribes to color changes. Returns the unsubscribe function. */
	onChange(listener: ColorListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private emit(value: string | null, color: string | null): void {
		this.listeners.forEach(listener => listener(value, color));
	}
}
