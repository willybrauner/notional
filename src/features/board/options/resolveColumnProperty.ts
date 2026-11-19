import type { BasesPropertyId, BasesViewConfig } from 'obsidian';
import { OPTION_KEYS } from '../constants';

// Not in the public API: the property picked in the toolbar Group menu
interface GroupableConfig {
	groupBy?: { property?: BasesPropertyId; direction?: 'ASC' | 'DESC' } | null;
}

export interface ColumnSource {
	property: BasesPropertyId;
	direction: 'ASC' | 'DESC';
}

/**
 * Property whose values make the columns: the native Group by when readable,
 * else the "Column property" view option.
 */
export function resolveColumnProperty(config: BasesViewConfig): ColumnSource | null {
	const groupBy = (config as unknown as GroupableConfig).groupBy;
	if (groupBy?.property) return { property: groupBy.property, direction: groupBy.direction === 'DESC' ? 'DESC' : 'ASC' };
	const property = config.getAsPropertyId(OPTION_KEYS.columnProperty);
	return property ? { property, direction: 'ASC' } : null;
}
