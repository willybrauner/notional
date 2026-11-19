import type { MetadataCache, TFile, Vault } from 'obsidian';

/**
 * Collects all existing values for a frontmatter key from markdown files
 * inside the same folder as the current .base file.
 */
export function collectFromBase(
	vault: Vault,
	metadataCache: MetadataCache,
	currentBaseFile: TFile | null,
	fmKey: string,
): string[] {
	const folderPath = currentBaseFile?.parent?.path ?? '';
	const fmKeyLower = fmKey.toLowerCase();
	const values = new Set<string>();
	vault.getMarkdownFiles().forEach(file => {
		if (folderPath && !file.path.startsWith(folderPath + '/')) return;
		const fm: Record<string, unknown> | undefined = metadataCache.getFileCache(file)?.frontmatter;
		if (!fm) return;
		const key = Object.keys(fm).find(k => k.toLowerCase() === fmKeyLower);
		const val = key ? fm[key] : undefined;
		if (typeof val === 'string' && val) values.add(val);
	});
	return [...values];
}
