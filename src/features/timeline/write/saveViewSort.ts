import type { BasesSortConfig, BasesViewConfig } from 'obsidian';

// Not in the public API: what the Sort menu does (`config.set('sort')` only
// writes a custom option, and unknown properties can't be picked in the menu)
interface SortableConfig {
	sort: BasesSortConfig[];
	query: { save: () => void };
}

/** Replaces the view sort and saves the .base file. */
export function saveViewSort(config: BasesViewConfig, sort: BasesSortConfig[]): void {
	const internal = config as unknown as SortableConfig;
	internal.sort = sort;
	internal.query.save();
}
