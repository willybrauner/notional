const COMBINING_MARK_START = 0x0300;
const COMBINING_MARK_END = 0x036f;
const DIACRITICS_REGEX = new RegExp(
	`[${String.fromCharCode(COMBINING_MARK_START)}-${String.fromCharCode(COMBINING_MARK_END)}]`,
	'g'
);

export function slugifyFilename(input: string): string {
	let slug = input.toLowerCase();
	slug = slug.normalize('NFD').replace(DIACRITICS_REGEX, '');
	slug = slug.replace(/[^a-z0-9\s-]/g, '').trim();
	slug = slug.replace(/[\s-]+/g, '-');
	return slug;
}
