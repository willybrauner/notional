import { startOfDay } from '../dates/startOfDay';
import type { Row } from './types';

/** True when a row next to the note starts on the same day (reordering would make sense). */
export function sharesStartDay(rows: Row[], path: string): boolean {
	const index = rows.findIndex(r => r.kind === 'entry' && r.file.path === path);
	const self = rows[index];
	if (!self || self.kind !== 'entry' || !self.start) return false;
	const day = startOfDay(self.start).getTime();
	return [rows[index - 1], rows[index + 1]].some(r => r?.kind === 'entry' && !!r.start && startOfDay(r.start).getTime() === day);
}
