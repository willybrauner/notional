import { Keymap, MarkdownView, TFile } from 'obsidian';
import { Feature } from '../../core/Feature';
import type { FeatureContext } from '../../core/types';
import { renameNote } from '../../utils/renameNote';
import { addMention } from './addMention';
import { clearMentions } from './clearMentions';
import { ATTRS, CLASSES, TARGET_EXTENSIONS } from './constants';
import { decorateBaseLinks } from './decorateBaseLinks';
import { focusInlineTitle } from './focusInlineTitle';
import { followTargetRename } from './followTargetRename';
import { MentionSuggest } from './MentionSuggest';
import { mentionToken } from './mentionToken';
import { pruneAllMentions } from './pruneAllMentions';
import { pruneMentions } from './pruneMentions';
import { renderInlineTitles } from './renderInlineTitles';
import { titleByOverlay } from './titleOverlays';

// Notion-like mention of a note in a note title: "@" in the inline title links a
// note (frontmatter `mentions`), rendered as a chip opening it in titles and bases.
export class TitleMentionFeature extends Feature {
	private readonly iconStore = this.ctx.services.icons;
	private observer: MutationObserver | null = null;
	private renderTimer: number | null = null;
	private suggests = new Map<HTMLElement, MentionSuggest>();
	// Base rename input: mentions picked, linked once the note is renamed to `title`
	private pending = new Map<string, { title: string; targets: TFile[] }>();

	constructor(ctx: FeatureContext) {
		super(ctx);
	}

	onload() {
		const { app } = this;
		this.registerEvent(app.workspace.on('file-open', () => this.scheduleRender()));
		this.registerEvent(app.workspace.on('layout-change', () => this.scheduleRender()));
		this.registerEvent(app.metadataCache.on('changed', () => this.scheduleRender()));
		// Icons turned off or on: chips render with or without them
		this.register(this.iconStore.onChange(() => this.scheduleRender()));
		this.registerEvent(app.vault.on('rename', (file, oldPath) => {
			if (!(file instanceof TFile) || !TARGET_EXTENSIONS.includes(file.extension)) return;
			if (file.extension === 'md') {
				void this.linkPending(file, oldPath);
				void pruneMentions(app, file);
			}
			void followTargetRename(app, file, oldPath);
			this.scheduleRender();
		}));

		this.observer = new MutationObserver(mutations => {
			for (const mut of mutations) {
				const el = mut.target.instanceOf(HTMLElement) ? mut.target : null;
				if (el?.closest(`.${CLASSES.basesView}, .${CLASSES.inlineTitle}`)) return this.scheduleRender();
			}
		});
		this.observer.observe(activeDocument.body, { childList: true, subtree: true });

		this.registerDomEvent(activeDocument, 'click', evt => this.onClick(evt), true);
		this.registerDomEvent(activeDocument, 'focusin', evt => {
			if (evt.targetNode?.instanceOf(HTMLInputElement) && evt.targetNode.matches(`.${CLASSES.renameInput}`)) this.attachRenameInputSuggest(evt.targetNode);
		});
		this.registerDomEvent(activeDocument, 'focusout', evt => {
			if (evt.targetNode?.instanceOf(HTMLElement) && evt.targetNode.matches(`.${CLASSES.inlineTitle}`)) this.scheduleRender();
		});
		this.onLayoutReady(() => {
			this.render();
			void pruneAllMentions(app);
		});
	}

	// Restores the plain titles and base links, and disables the popovers
	onunload() {
		this.observer?.disconnect();
		this.observer = null;
		if (this.renderTimer !== null) window.clearTimeout(this.renderTimer);
		this.renderTimer = null;
		this.suggests.forEach(suggest => {
			suggest.disposed = true;
			suggest.close();
		});
		this.suggests.clear();
		this.pending.clear();
		clearMentions(this.app);
	}

	// Debounced on a timeout, not rAF: Obsidian is often in the background
	private scheduleRender() {
		if (this.renderTimer !== null) return;
		this.renderTimer = window.setTimeout(() => {
			this.renderTimer = null;
			this.render();
		}, 30);
	}

	private render() {
		this.attachSuggests();
		renderInlineTitles(this.app, this.iconStore);
		decorateBaseLinks(this.app, this.iconStore);
	}

	// One "@" popover per inline title element
	private attachSuggests() {
		// Titles of closed views
		this.suggests.forEach((suggest, titleEl) => {
			if (titleEl.isConnected) return;
			suggest.disposed = true;
			this.suggests.delete(titleEl);
		});
		this.app.workspace.iterateAllLeaves(leaf => {
			const view = leaf.view;
			if (!(view instanceof MarkdownView)) return;
			view.containerEl.querySelectorAll<HTMLDivElement>(`.${CLASSES.inlineTitle}`).forEach(titleEl => {
				if (this.suggests.has(titleEl)) return;
				this.suggests.set(titleEl, new MentionSuggest(this.app, titleEl, this.iconStore, () => view.file, (host, target, title) => {
					titleEl.blur();
					void this.applyMention(host, target, title);
				}));
			});
		});
	}

	// Rename input of a note in a base (inline-note-rename: table cell, board card,
	// timeline entry), which carries the note path: same popover.
	// The input renames the note itself when validated, so a picked mention waits
	// for that rename (nothing is written if the rename is cancelled)
	private attachRenameInputSuggest(input: HTMLInputElement) {
		if (this.suggests.has(input)) return;
		const host = this.app.vault.getFileByPath(input.dataset.notionalPath ?? '');
		if (!host) return;
		const pending = { title: input.value.trim(), targets: [] as TFile[] };
		this.pending.set(host.path, pending);
		input.addEventListener('input', () => { pending.title = input.value.trim(); });
		this.suggests.set(input, new MentionSuggest(this.app, input, this.iconStore, () => host, (_, target, title) => {
			pending.title = title;
			if (!pending.targets.includes(target)) pending.targets.push(target);
		}));
	}

	private async linkPending(file: TFile, oldPath: string) {
		const pending = this.pending.get(oldPath);
		if (!pending) return;
		this.pending.delete(oldPath);
		if (file.basename !== pending.title) return;
		for (const target of pending.targets) {
			if (file.basename.includes(mentionToken(target.basename))) await addMention(this.app, file, target);
		}
	}

	// Renames the note to the new title (the inline title doesn't save a value
	// set by code), then links the target. In this order: writing the frontmatter
	// right before a rename leaves the open editor with the old content.
	private async applyMention(host: TFile, target: TFile, title: string) {
		if (title && host.basename !== title) await renameNote(this.app, host, title);
		await addMention(this.app, host, target);
	}

	// Chip → opens the mentioned note; "Open" button → opens the note itself;
	// rest of a title overlay → edits the title
	private onClick(evt: MouseEvent) {
		const target = evt.targetNode;
		if (!target?.instanceOf(Element)) return;
		const path = target.closest(`.${CLASSES.openButton}`)?.getAttribute(ATTRS.openPath)
			?? target.closest(`.${CLASSES.mention}`)?.getAttribute(ATTRS.mentionPath);
		if (path) {
			evt.preventDefault();
			evt.stopPropagation();
			void this.app.workspace.openLinkText(path, '', Keymap.isModEvent(evt));
			return;
		}
		const overlay = target.closest<HTMLElement>(`.${CLASSES.titleOverlay}`);
		const titleEl = overlay ? titleByOverlay.get(overlay) : undefined;
		if (titleEl) focusInlineTitle(titleEl);
	}
}
