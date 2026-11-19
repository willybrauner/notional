/** True when a raw date value carries a time of day (`2026-10-17T15:00`, `2026-10-17 15:00`). */
export function hasTime(raw: string | null): boolean {
	return !!raw && /[T ]\d{2}:\d{2}/.test(raw);
}
