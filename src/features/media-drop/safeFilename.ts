// A dropped file name usable as a vault file name: no path separator or character
// Obsidian refuses in a name or a link, no leading dot (a hidden file), never empty.
export function safeFilename(name: string, fallback = 'file'): string {
	const dotIndex = name.lastIndexOf('.');
	const base = (dotIndex > 0 ? name.slice(0, dotIndex) : name)
		.replace(/[\\/:*?"<>|#^[\]]/g, '-')
		.replace(/^[.\s]+|\s+$/g, '');
	const ext = dotIndex > 0 && /^\.\w+$/.test(name.slice(dotIndex)) ? name.slice(dotIndex) : '';
	return `${base || fallback}${ext}`;
}
