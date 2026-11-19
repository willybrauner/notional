import { buildFilterRule } from '../../constants/base-filter';

/**
 * Content of a base with its folder filter rule pointing at `folderPath`. The
 * rule may be unquoted (written by an older Notionalize) or between single quotes
 * (Notionalize now, and Obsidian when it saves the base): it is written back quoted.
 */
export function replaceFolderFilter(content: string, folderPath: string): string {
	return content.replace(/^ {4}- '?file\.inFolder\(.*$/m, () => `    - ${buildFilterRule(folderPath)}`);
}
