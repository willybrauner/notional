import { CLASSES } from './constants';

// Chromium fires clipboard events at the text selection or the focused editable,
// else at <body>: the focused base table (a plain focusable div) never gets them.
// Listened on the document: re-dispatches the event on the focused table with the
// same clipboardData (writable during the original dispatch), and cancels the
// original if the table handled it.
// A selected text keeps the native behavior (copy the text).
export function forwardToTable(evt: ClipboardEvent): void {
	const doc = evt.currentTarget as Document;
	const table = doc.activeElement;
	if (!table?.instanceOf(HTMLElement) || !table.classList.contains(CLASSES.tableContainer)) return;
	const target = evt.target as Node | null;
	if (target?.instanceOf(Node) && table.contains(target)) return;
	const selection = doc.getSelection();
	if (selection && !selection.isCollapsed) return;
	const forwarded = new ClipboardEvent(evt.type, {
		clipboardData: evt.clipboardData,
		bubbles: true,
		cancelable: true,
	});
	table.dispatchEvent(forwarded);
	if (forwarded.defaultPrevented) evt.preventDefault();
}
