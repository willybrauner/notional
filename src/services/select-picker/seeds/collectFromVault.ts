import type { MetadataCache, Vault } from 'obsidian';

/**
 * Collects all existing values for a frontmatter key across the entire vault.
 */
export function collectFromVault(
	vault: Vault,
	metadataCache: MetadataCache,
	fmKey: string,
): string[] {
	const fmKeyLower = fmKey.toLowerCase();
	const values = new Set<string>();
	vault.getMarkdownFiles().forEach(file => {
		const fm: Record<string, unknown> | undefined = metadataCache.getFileCache(file)?.frontmatter;
		if (!fm) return;
		const key = Object.keys(fm).find(k => k.toLowerCase() === fmKeyLower);
		const val = key ? fm[key] : undefined;
		if (typeof val === 'string' && val) values.add(val);
	});
	return [...values];
}
