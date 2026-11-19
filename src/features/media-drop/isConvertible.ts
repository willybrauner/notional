import { CONVERTIBLE_EXTENSIONS } from './constants';

export function isConvertible(filename: string): boolean {
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	return CONVERTIBLE_EXTENSIONS.has(ext);
}
