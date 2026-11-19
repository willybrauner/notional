import type { BasesViewConfig } from 'obsidian';
import { LEGACY_OPTION_KEYS } from '../constants';

/**
 * Moves the values stored under the unprefixed keys of earlier versions to
 * their prefixed key, then removes the old key (`set(key, null)` deletes it).
 * Each change saves the .base, so this only writes when an old key is left.
 */
export function migrateLegacyKeys(config: BasesViewConfig): void {
	for (const [legacy, key] of Object.entries(LEGACY_OPTION_KEYS)) {
		const value = config.get(legacy);
		if (value === undefined || value === null) continue;
		if (config.get(key) === undefined) config.set(key, value);
		config.set(legacy, null);
	}
}
