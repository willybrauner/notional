// Smallest gap between two values before the run is renumbered
const MIN_STEP = 1e-6;

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/**
 * Manual order values once the note at `from` is moved to `target`, in the
 * run's new display order. Writes as few notes as possible: the moved note gets
 * a value between its new neighbours, and notes without a value (sorted last by
 * Bases) only get one when they end up above it. Null: no value needed.
 * Invalid or too close values renumber the whole run instead.
 */
export function computeOrderValues(values: unknown[], from: number, target: number, descending: boolean): (number | null)[] {
	// Keys ascend along the display order, whatever the sort direction
	const sign = descending ? -1 : 1;
	const toValue = (key: number) => key * sign + 0;
	const keys = values.map(v => typeof v === 'number' && Number.isFinite(v) ? v * sign : null);

	const order = values.map((_, i) => i);
	order.splice(from, 1);
	order.splice(target, 0, from);
	const renumber = () => order.map((_, i) => toValue(i));

	// A value that isn't a number (e.g. typed as text) has no known sort position
	const isEmpty = (v: unknown) => v === undefined || v === null || v === '';
	if (values.some((v, i) => keys[i] === null && !isEmpty(v))) return renumber();

	// Kept keys, in the new order (the moved note is free)
	const kept = order.map(i => i === from ? null : keys[i] ?? null);
	const others = kept.filter((_, p) => p !== target);
	const firstEmpty = others.findIndex(k => k === null);
	const valued = firstEmpty < 0 ? others : others.slice(0, firstEmpty);
	// Expected from Bases: valued notes first, ascending, then notes without a value
	const isConsistent = valued.every((k, i) => k !== null && (i === 0 || k > (valued[i - 1] ?? 0)))
		&& others.slice(valued.length).every(k => k === null);
	if (!isConsistent) return renumber();

	const lastKept = kept.reduce<number>((last, k, p) => k === null ? last : p, -1);
	const end = Math.max(target, lastKept);
	const result: (number | null)[] = kept.map((k, p) => p > end ? null : k);

	// Fill each stretch of free slots between the kept keys around it
	for (let p = 0; p <= end; p++) {
		if (result[p] !== null) continue;
		let q = p;
		while (q + 1 <= end && result[q + 1] === null) q++;
		const count = q - p + 1;
		const lo = p > 0 ? result[p - 1] ?? null : null;
		const hi = q < end ? result[q + 1] ?? null : null;
		for (let i = 0; i < count; i++) {
			if (lo === null && hi === null) result[p + i] = i;
			else if (lo === null && hi !== null) result[p + i] = hi - count + i;
			else if (lo !== null && hi === null) result[p + i] = lo + 1 + i;
			else if (lo !== null && hi !== null) {
				const step = (hi - lo) / (count + 1);
				if (step < MIN_STEP) return renumber();
				result[p + i] = round(lo + step * (i + 1));
			}
		}
		p = q;
	}

	// Rounding may have collapsed two values
	const filled = result.slice(0, end + 1);
	if (filled.some((k, i) => k === null || (i > 0 && k <= (filled[i - 1] ?? 0)))) return renumber();
	return result.map(k => k === null ? null : toValue(k));
}
