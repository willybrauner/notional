import { App, TFile, normalizePath } from 'obsidian';

// Writes a frontmatter value, matching the existing key case-insensitively
export async function writeFrontmatterValue(app: App, sourcePath: string, fmKeyStr: string, value: string): Promise<void> {
	const file = findSourceFile(app, sourcePath);
	if (!file) return;
	await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
		const key = Object.keys(fm).find(k => k.toLowerCase() === fmKeyStr.toLowerCase()) ?? fmKeyStr;
		fm[key] = value;
	});
}

// The file at `sourcePath` as given, else at its URL-decoded form (a path read from a link).
// A note named `100% done.md` is found as is, and its `%` never throws.
function findSourceFile(app: App, sourcePath: string): TFile | null {
	const exact = app.vault.getAbstractFileByPath(normalizePath(sourcePath));
	if (exact instanceof TFile) return exact;
	let decoded: string;
	try {
		decoded = decodeURIComponent(sourcePath);
	} catch {
		return null;
	}
	const file = app.vault.getAbstractFileByPath(normalizePath(decoded));
	return file instanceof TFile ? file : null;
}
