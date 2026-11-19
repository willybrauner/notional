import type { App } from 'obsidian';
import { getTypeManager } from '../write/getTypeManager';

/** Names of the vault properties typed "Date" or "Date & time" (internal type registry, empty without it). */
export function readVaultDateProperties(app: App): string[] {
	const all = getTypeManager(app)?.getAllProperties() ?? {};
	return Object.values(all)
		.filter(info => info.widget === 'date' || info.widget === 'datetime')
		.map(info => info.name);
}
