import { parsePropertyId } from 'obsidian';
import type { BasesAllOptions, BasesPropertyId } from 'obsidian';
import { OPTION_KEYS } from '../constants';

// Only properties that can hold a date: notes, formulas, file created/modified time
function isDateCandidate(prop: BasesPropertyId): boolean {
	const { type, name } = parsePropertyId(prop);
	return type !== 'file' || name === 'ctime' || name === 'mtime';
}

/** Options shown in the Bases view config menu for the timeline. */
export function getViewOptions(): BasesAllOptions[] {
	return [
		{
			type: 'property',
			key: OPTION_KEYS.startProperty,
			displayName: 'Start date',
			placeholder: 'Select a property',
			filter: isDateCandidate,
		},
		{
			type: 'property',
			key: OPTION_KEYS.endProperty,
			displayName: 'End date',
			placeholder: 'None (single day)',
			filter: isDateCandidate,
		},
		{
			type: 'toggle',
			key: OPTION_KEYS.showSidebar,
			displayName: 'Show list',
			default: true,
		},
	];
}
