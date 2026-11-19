import { CLASSES } from './constants';

// Links the feature prepends an icon to (rendered views; the editor's are CodeMirror widgets)
const LINKS = `.${CLASSES.internalLink}, .${CLASSES.cmHmdInternalLink}, a.${CLASSES.externalLink}`;

/**
 * Removes what the feature added to the page (feature turned off): header areas
 * and icons, base title rows (unwrapped), file explorer and link icons, and the
 * text wrapper of the links. Tab icons are restored by `restoreTabIcons`.
 */
export function clearIcons(root: ParentNode): void {
	root.querySelectorAll(`.${CLASSES.iconArea}, .${CLASSES.iconHeader}, .${CLASSES.iconNav}`).forEach(el => el.remove());
	root.querySelectorAll(`.${CLASSES.dbTitleRow}`).forEach(row => row.replaceWith(...Array.from(row.childNodes)));
	root.querySelectorAll<HTMLElement>(LINKS).forEach(link => {
		link.querySelectorAll(`:scope > .${CLASSES.iconInline}`).forEach(el => el.remove());
		const text = link.querySelector(`:scope > .${CLASSES.internalLinkText}`);
		text?.replaceWith(...Array.from(text.childNodes));
	});
}
