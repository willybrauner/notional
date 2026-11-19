import { Notice } from 'obsidian';
import type { App, TFile } from 'obsidian';
import { renameNote } from '../../utils/renameNote';
import { CLASSES } from './constants';

export interface RenameInputOptions {
	app: App;
	file: TFile;
	// Element the input covers (positioned over it)
	container: HTMLElement;
	// Element hidden while renaming (the name under the input)
	hidden: HTMLElement;
}

// One rename at a time, in any view
let active: HTMLInputElement | null = null;

/**
 * Input over a note name (base cell, board card, timeline title): Enter/blur
 * renames the note, Escape cancels. Carries the note path (`data-notional-path`)
 * for the features adding to it (title mention "@" suggest). Returns null when
 * another rename is open.
 */
export function mountRenameInput(o: RenameInputOptions): HTMLInputElement | null {
	if (active) return null;
	const { app, file, container, hidden } = o;
	const originalName = file.basename;

	const input = createEl('input');
	input.type = 'text';
	input.value = originalName;
	input.className = CLASSES.input;
	input.dataset.notionalPath = file.path;

	// position:absolute within the container instead of position:fixed on body:
	// on iOS, position:fixed drifts when the virtual keyboard appears
	if (getComputedStyle(container).position === 'static') container.addClass(CLASSES.inputContainer);
	const rect = container.getBoundingClientRect();
	Object.assign(input.style, {
		position: 'absolute',
		top: '0',
		left: '0',
		width: `${rect.width}px`,
		height: `${rect.height}px`,
		zIndex: '9999',
		paddingLeft: '12px',
	});

	// Clicks and drags inside the input stay there (cards and bars open or move on them)
	for (const type of ['pointerdown', 'mousedown', 'click', 'dblclick']) {
		input.addEventListener(type, evt => evt.stopPropagation());
	}

	hidden.addClass(CLASSES.hiddenName);
	container.appendChild(input);
	active = input;
	input.focus();
	input.select();

	let done = false;
	const dismiss = () => {
		input.remove();
		hidden.removeClass(CLASSES.hiddenName);
		container.removeClass(CLASSES.inputContainer);
		active = null;
	};

	const save = async () => {
		if (done) return;
		done = true;
		const newName = input.value.trim();
		dismiss();
		if (!newName || newName === originalName) return;
		try {
			await renameNote(app, file, newName);
		} catch (e) {
			new Notice(`Could not rename the note: ${e instanceof Error ? e.message : String(e)}`);
		}
	};

	const cancel = () => {
		if (done) return;
		done = true;
		dismiss();
	};

	input.addEventListener('blur', () => { void save(); });
	input.addEventListener('keydown', (e: KeyboardEvent) => {
		// Already handled by a popover on the input (title mention "@" suggest)
		if (e.defaultPrevented) return;
		if (e.key === 'Enter') { e.preventDefault(); void save(); }
		else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
	});
	return input;
}
