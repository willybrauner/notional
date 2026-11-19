/** Returns a new Date shifted by n calendar days (DST-safe, keeps time of day). */
export function addDays(date: Date, n: number): Date {
	const d = new Date(date.getTime());
	d.setDate(d.getDate() + n);
	return d;
}
