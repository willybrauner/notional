import { HEIC_EXTENSIONS } from './constants';

export function isHeic(filename: string): boolean {
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	return HEIC_EXTENSIONS.has(ext);
}
