import { FileView } from 'obsidian';
import { CLASSES } from './constants';

// Folder note (`X/X.md`, `X/X.base`): the last breadcrumb repeats the title.
// Hidden with its separator rather than removed, so breadcrumb indexes keep
// matching the file path segments (see handleBreadcrumbClick).
export function hideDuplicateBreadcrumb(view: FileView) {
	const file = view.file;
	const parentEl = view.containerEl.querySelector(`.${CLASSES.breadcrumbParent}`);
	if (!file || !parentEl) return;

	parentEl.querySelectorAll(`.${CLASSES.duplicate}`).forEach((el) => el.removeClass(CLASSES.duplicate));
	if (file.parent?.name !== file.basename) return;

	const lastBreadcrumb = Array.from(parentEl.querySelectorAll(`.${CLASSES.breadcrumb}`)).pop();
	lastBreadcrumb?.addClass(CLASSES.duplicate);
	lastBreadcrumb?.nextElementSibling?.addClass(CLASSES.duplicate);
}
