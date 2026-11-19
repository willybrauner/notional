import type { BasesAllOptions } from 'obsidian';
import { DEFAULT_COLUMN_WIDTH, DEFAULT_IMAGE_ASPECT_RATIO, MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH, OPTION_KEYS } from '../constants';

/** Options shown in the Bases view config menu for the board. */
export function getViewOptions(): BasesAllOptions[] {
	return [
		{
			type: 'property',
			key: OPTION_KEYS.columnProperty,
			displayName: 'Column property',
			placeholder: 'Uses the Group by property',
		},
		{
			type: 'multitext',
			key: OPTION_KEYS.hiddenColumns,
			displayName: 'Hidden columns',
		},
		{
			type: 'slider',
			key: OPTION_KEYS.columnWidth,
			displayName: 'Column width',
			default: DEFAULT_COLUMN_WIDTH,
			min: MIN_COLUMN_WIDTH,
			max: MAX_COLUMN_WIDTH,
			step: 10,
		},
		{
			type: 'property',
			key: OPTION_KEYS.imageProperty,
			displayName: 'Image property',
			placeholder: 'None',
		},
		{
			type: 'dropdown',
			key: OPTION_KEYS.imageFit,
			displayName: 'Image fit',
			default: 'cover',
			options: { cover: 'Cover', contain: 'Contain' },
		},
		{
			type: 'slider',
			key: OPTION_KEYS.imageAspectRatio,
			displayName: 'Image aspect ratio',
			default: DEFAULT_IMAGE_ASPECT_RATIO,
			min: 0.25,
			max: 2.5,
			step: 0.05,
		},
	];
}
