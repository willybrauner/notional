/** Returns a new Date shifted by n minutes. */
export function addMinutes(date: Date, n: number): Date {
	return new Date(date.getTime() + n * 60 * 1000);
}
