import type { BasesEntry } from 'obsidian';

export interface Column {
	// Lowercased value ('' for the "no value" column)
	key: string;
	// Value as written in the notes
	label: string;
	entries: BasesEntry[];
}
