import { iconPacks, type IconPack } from './iconPacks';

/** Adds a pack on top of the bundled icons. Returns the function removing it. */
export function registerIconPack(pack: IconPack): () => void {
	iconPacks.push(pack);
	return () => {
		const index = iconPacks.indexOf(pack);
		if (index !== -1) iconPacks.splice(index, 1);
	};
}
