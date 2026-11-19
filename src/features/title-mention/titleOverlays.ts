// Overlay of each inline title, and back. Obsidian moves the title element
// between containers (source/live preview/reading): siblings can't be trusted.
export const overlayByTitle = new WeakMap<HTMLElement, HTMLElement>();
export const titleByOverlay = new WeakMap<HTMLElement, HTMLElement>();
