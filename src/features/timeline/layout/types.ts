import type { BasesEntry, TFile } from 'obsidian';

export interface EntryRow {
	kind: 'entry';
	entry: BasesEntry;
	file: TFile;
	title: string;
	start: Date | null;
	end: Date | null;
	startRaw: string | null;
	endRaw: string | null;
	// The entry has its own end value (otherwise end = start)
	hasEnd: boolean;
	// Start or end carries a time of day (placed at its time in the hour zoom)
	timed: boolean;
	// Start can be moved (note.* property)
	movable: boolean;
	// End can be resized (end property configured and note.*)
	resizable: boolean;
}

export interface GroupRow {
	kind: 'group';
	label: string;
	count: number;
}

export type Row = EntryRow | GroupRow;

export interface Range {
	start: Date;
	days: number;
}
