import { EditorView, WidgetType, Decoration, DecorationSet } from '@codemirror/view';
import { StateField, StateEffect, Extension } from '@codemirror/state';

// Dispatch this effect on a CodeMirror view to force icon decoration recomputation.
export const refreshIconsEffect = StateEffect.define<void>();
import { App } from 'obsidian';
import { IconStore } from '../../services/icons/IconStore';
import { createIconEl } from './render';
import { CLASSES } from './constants';

class IconWidget extends WidgetType {
	private filePath: string;
	private configKey: string;

	constructor(private store: IconStore, app: App, private href: string) {
		super();
		const dest = app.metadataCache.getFirstLinkpathDest(href, '');
		this.filePath = dest?.path ?? href;
		const config = store.resolve(this.filePath);
		this.configKey = `${config.icon}:${config.color}`;
	}

	eq(other: IconWidget): boolean {
		return other.href === this.href && other.configKey === this.configKey;
	}

	toDOM(): HTMLElement {
		const wrapper = createSpan();
		wrapper.className = CLASSES.iconInlineWrapper;

		const config = this.store.resolve(this.filePath);
		const iconEl = createIconEl(config, 'inline');
		iconEl.dataset.notionalPath = this.filePath;
		wrapper.appendChild(iconEl);
		return wrapper;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

class ExternalLinkIconWidget extends WidgetType {
	constructor(private hostname: string) {
		super();
	}

	eq(other: ExternalLinkIconWidget): boolean {
		return other.hostname === this.hostname;
	}

	toDOM(): HTMLElement {
		const wrapper = createSpan();
		wrapper.className = CLASSES.iconInlineWrapper;
		const iconEl = createIconEl({ icon: `favicon:${this.hostname}`, color: 'default' }, 'inline');
		wrapper.appendChild(iconEl);
		return wrapper;
	}

	ignoreEvent(): boolean {
		return false;
	}
}

// ─── Auto-computed Decoration Field

function createInlineIconField(store: IconStore, app: App) {
	return StateField.define<DecorationSet>({
		create(state) {
			return computeDecorations(state.doc.toString(), store, app);
		},
		update(decorations, transaction) {
			// Recalculate decorations if document changed or icon store was invalidated
			if (transaction.docChanged || transaction.effects.some((e) => e.is(refreshIconsEffect))) {
				return computeDecorations(transaction.newDoc.toString(), store, app);
			}
			return decorations;
		},
		provide: (field) => EditorView.decorations.from(field),
	});
}

const SOLE_LINK_LINE_CLASS = 'notional-sole-link-line';
// A wikilink, a markdown external link (not an image embed) or a bare URL, alone on its line
const soleLinkLineRegex =
	/^\s*(?:\[\[[^\]]+\]\]|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/\S+)\s*$/;

function computeDecorations(text: string, store: IconStore, app: App): DecorationSet {
	const ranges: ReturnType<Decoration['range']>[] = [];
	const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

	let match;
	while ((match = wikiLinkRegex.exec(text)) !== null) {
		const href = match[1];
		if (href) {
			const widget = new IconWidget(store, app, href);
			ranges.push(Decoration.widget({ widget, side: -1 }).range(match.index));
		}
	}

	// Markdown external links: [text](https://...) — favicon before the text.
	// Image embeds (![alt](url)) are matched with their `!` and skipped: no
	// lookbehind, which iOS before 16.4 doesn't support.
	const externalLinkRegex = /(!?)\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
	let extMatch;
	while (store.faviconsEnabled && (extMatch = externalLinkRegex.exec(text)) !== null) {
		const url = extMatch[3];
		if (extMatch[1] || !url) continue;
		try {
			const hostname = new URL(url).hostname;
			if (hostname) {
				const widget = new ExternalLinkIconWidget(hostname);
				ranges.push(Decoration.widget({ widget, side: -1 }).range(extMatch.index));
			}
		} catch {
			// invalid URL, skip
		}
	}

	// Add vertical padding to lines that contain only a single link (internal or external)
	const lines = text.split('\n');
	let pos = 0;
	for (const line of lines) {
		if (soleLinkLineRegex.test(line)) {
			ranges.push(Decoration.line({ class: SOLE_LINK_LINE_CLASS }).range(pos));
		}
		pos += line.length + 1;
	}

	return ranges.length > 0 ? Decoration.set(ranges, true) : Decoration.none;
}

// ─── Export Extension

export function createInlineIconExtension(store: IconStore, app: App): Extension {
	return createInlineIconField(store, app);
}
