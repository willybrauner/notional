import { TEMPLATE_BASENAME } from '../shared/constants';

// A string of a filter formula, between double quotes, its backslashes and quotes escaped.
function formulaString(value: string): string {
	return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function buildFilterExpression(folderPath: string): string {
	const folder = formulaString(folderPath);
	const depth = (folderPath.match(/\//g) || []).length + 1;
	return [
		`file.inFolder(${folder})`,
		`file.basename != ${formulaString(folderPath.split('/').pop() ?? '')}`,
		`file.basename != ${formulaString(TEMPLATE_BASENAME)}`,
		`(file.folder == ${folder} || (file.basename == file.folder.split("/")[file.folder.split("/").length - 1] && file.folder.split("/").length == ${depth + 1}))`,
		`(file.ext == "md" || file.ext == "base")`,
	].join(' && ');
}

// The filter rule as a YAML item value: single-quoted, so a folder name with `: ` or ` #`
// stays inside the string, as Obsidian writes it when it saves a base.
export function buildFilterRule(folderPath: string): string {
	return `'${buildFilterExpression(folderPath).replace(/'/g, "''")}'`;
}

export function buildBaseFilterSection(folderPath: string): string {
	return `filters:\n  and:\n    - ${buildFilterRule(folderPath)}`;
}

export function buildBaseInitialContent(folderPath: string): string {
	const tableView = `views:\n  - type: table\n    name: Table\n    order:\n      - file.name\n    columnSize:\n      file.name: 320\n`;
	return `${buildBaseFilterSection(folderPath)}\n${tableView}`;
}
