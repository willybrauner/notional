import type { App } from 'obsidian';

// Obsidian internal: vault-wide property types (.obsidian/types.json), not in the public API
export interface TypeManager {
	getAllProperties(): Record<string, { name: string; widget?: string }>;
	getPropertyInfo(name: string): { widget?: string } | undefined;
	setType(name: string, type: string): void;
}

/** The internal property type registry, or null when this Obsidian version doesn't have it. */
export function getTypeManager(app: App): TypeManager | null {
	return (app as App & { metadataTypeManager?: TypeManager }).metadataTypeManager ?? null;
}
