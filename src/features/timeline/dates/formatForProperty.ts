import { toMoment } from './toMoment';
import { DATE_FORMAT, DATETIME_FORMAT } from '../constants';
import { hasTime } from './hasTime';

/**
 * Formats a date for the frontmatter, keeping the shape of the original value:
 * datetime stays datetime (with or without seconds), date-only stays date-only.
 * withTime writes a datetime even when the original value had none (hour zoom).
 */
export function formatForProperty(date: Date, originalRaw: string | null, withTime = false): string {
	if (originalRaw && /[T ]\d{2}:\d{2}:\d{2}/.test(originalRaw)) {
		return toMoment(date).format(`${DATETIME_FORMAT}:ss`);
	}
	if (withTime || hasTime(originalRaw)) {
		return toMoment(date).format(DATETIME_FORMAT);
	}
	return toMoment(date).format(DATE_FORMAT);
}
