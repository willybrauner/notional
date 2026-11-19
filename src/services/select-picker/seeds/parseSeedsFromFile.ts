import { parseYaml } from 'obsidian';
import type { TFile, Vault } from 'obsidian';
import { extractProperties } from './extractProperties';
import { normalizeKey } from './normalizeKey';

/**
 * Parses 'select.options' from a .base file's YAML and returns them keyed
 * by normalized property name (lowercase, no 'note.' prefix).
 */
export async function parseSeedsFromFile(vault: Vault, file: TFile): Promise<Record<string, string[]>> {
	let content: string;
	// The file may be moving with its folder (a base renamed with its folder): no seeds
	try { content = await vault.read(file); } catch { return {}; }
	let parsed: unknown;
	try { parsed = parseYaml(content); } catch { return {}; }

	const result: Record<string, string[]> = {};
	for (const [key, value] of Object.entries(extractProperties(parsed))) {
		if (!value || typeof value !== 'object') continue;
		const prop = value as Record<string, unknown>;
		if (!('select.options' in prop)) continue;
		const raw = prop['select.options'];
		result[normalizeKey(key)] = Array.isArray(raw) ? raw.map(String) : [];
	}
	return result;
}
