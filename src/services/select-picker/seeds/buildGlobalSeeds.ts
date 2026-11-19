import type { Vault } from 'obsidian';
import { parseSeedsFromFile } from './parseSeedsFromFile';

/**
 * Scans all .base files in the vault and merges their select.options
 * into a single map keyed by normalized property name.
 */
export async function buildGlobalSeeds(vault: Vault): Promise<Record<string, string[]>> {
	const result: Record<string, string[]> = {};
	const baseFiles = vault.getFiles().filter(f => f.extension === 'base');
	for (const f of baseFiles) {
		const seeds = await parseSeedsFromFile(vault, f);
		for (const [key, values] of Object.entries(seeds)) {
			result[key] = [...new Set([...(result[key] ?? []), ...values])];
		}
	}
	return result;
}
