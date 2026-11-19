/** Returns the stored color for a value (case-insensitive key), or null. */
export function getColor(colorMap: Record<string, string>, value: string): string | null {
	return colorMap[value.toLowerCase()] ?? null;
}
