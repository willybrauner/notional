/** Extracts the 'properties' map from a parsed .base YAML object, or returns {}. */
export function extractProperties(parsed: unknown): Record<string, unknown> {
	if (typeof parsed !== 'object' || parsed === null || !('properties' in parsed)) return {};
	const props = (parsed as Record<string, unknown>)['properties'];
	return typeof props === 'object' && props !== null ? (props as Record<string, unknown>) : {};
}
