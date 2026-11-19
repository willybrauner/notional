const NEW_ITEM_FOLDER_LINE = /^newItemFolder:.*$/m;
const NEW_ITEM_FOLDER_LINE_WITH_EOL = /^newItemFolder:.*(\r?\n)?/m;

// Sets the base's top-level `newItemFolder` so Obsidian creates new items
// (toolbar "New", "Add item" command, grouped views…) in `folderPath`.
// Root-level bases get no `newItemFolder`: Obsidian's default location applies.
export function withNewItemFolder(content: string, folderPath: string): string {
	if (!folderPath || folderPath === '/') return content.replace(NEW_ITEM_FOLDER_LINE_WITH_EOL, '');
	const line = `newItemFolder: ${JSON.stringify(folderPath)}`;
	if (NEW_ITEM_FOLDER_LINE.test(content)) return content.replace(NEW_ITEM_FOLDER_LINE, line);
	// Appended at the end, where Obsidian itself serializes it
	const separator = content === '' || content.endsWith('\n') ? '' : '\n';
	return `${content}${separator}${line}\n`;
}
