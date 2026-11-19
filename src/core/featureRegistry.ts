import { defineFeature } from './defineFeature';
import type { FeatureDefinition } from './types';
import { ReskinSearchFeature } from '../features/reskin-search/reskin-search';
import { NoteTemplateFeature } from '../features/note-template/note-template';
import { FolderPageFeature } from '../features/folder-page/folder-page';
import { FolderViewFeature } from '../features/folder-view/folder-view';
import { DatabaseHeaderFeature } from '../features/database-header/database-header';
import { AutoRenameParentFolderFeature } from '../features/auto-rename-parent-folder/auto-rename-parent-folder';
import { MediaDropFeature } from '../features/media-drop/media-drop';
import { HideBaseExtensionFeature } from '../features/hide-base-extension/hide-base-extension';
import { AutoBaseFilterFeature } from '../features/auto-base-filter/auto-base-filter';
import { InlineNoteRenameFeature } from '../features/inline-note-rename/inline-note-rename';
import { SelectPropertyFeature } from '../features/select-property/select-property';
import { BreadcrumbNavFeature } from '../features/breadcrumb-nav/breadcrumb-nav';
import { PrettierFeature } from '../features/prettier/prettier';
import { SidePeekFeature } from '../features/side-peek/side-peek';
import { TimelineFeature } from '../features/timeline/timeline';
import { TagColorsFeature } from '../features/tag-colors/tag-colors';
import { BoardFeature } from '../features/board/board';
import { TitleMentionFeature } from '../features/title-mention/title-mention';
import { TableClipboardFeature } from '../features/table-clipboard/table-clipboard';
import { BaseOwnContextFeature } from '../features/base-own-context/base-own-context';
import { IconsFeature } from '../features/icons/icons';
import { VisualTweakFeature } from '../features/visual-tweaks/visual-tweaks';

/**
 * Every feature, in load order (the order of their listeners matters, keep it).
 */
export const FEATURES: readonly FeatureDefinition[] = [
	defineFeature({
		id: 'reskin-search',
		name: 'Clean search results',
		description: 'Shows the file name, its icon and its folder in the quick switcher and link suggestions.',
		section: 'Editor',
		create: ctx => new ReskinSearchFeature(ctx),
	}),
	defineFeature({
		id: 'note-template',
		name: 'Folder templates',
		description: 'A note created in a folder starts from the _template.md of that folder.',
		section: 'Folder notes',
		create: ctx => new NoteTemplateFeature(ctx),
	}),
	defineFeature({
		id: 'folder-page',
		name: 'Folder pages',
		description: 'Type /page, /base or /todo in a note to create a folder page, a folder base or a task list inline.',
		section: 'Folder notes',
		create: ctx => new FolderPageFeature(ctx),
	}),
	defineFeature({
		id: 'folder-view',
		name: 'Open folder notes',
		description: 'Clicking a folder in the file explorer opens its folder note (same name, .md or .base).',
		section: 'Folder notes',
		create: ctx => new FolderViewFeature(ctx),
	}),
	defineFeature({
		id: 'database-header',
		name: 'Database header',
		description: 'Shows an editable title above every base, which renames the base and its folder.',
		section: 'Bases',
		create: ctx => new DatabaseHeaderFeature(ctx),
	}),
	defineFeature({
		id: 'auto-rename-parent-folder',
		name: 'Rename the folder with its note',
		description: 'Renaming a folder note renames its folder too.',
		section: 'Folder notes',
		create: ctx => new AutoRenameParentFolderFeature(ctx),
	}),
	defineFeature({
		id: 'media-drop',
		name: 'Media drop',
		description: 'Files dropped or pasted in a note go to an _assets folder next to it, images converted to WebP.',
		section: 'Editor',
		create: ctx => new MediaDropFeature(ctx),
	}),
	defineFeature({
		id: 'hide-base-extension',
		name: 'Hide .base in links',
		description: 'Links shown inside a base read "tasks" instead of "tasks.base".',
		section: 'Bases',
		defaultEnabled: false,
		create: ctx => new HideBaseExtensionFeature(ctx),
	}),
	defineFeature({
		id: 'auto-base-filter',
		name: 'Folder-scoped bases',
		description: 'Every base only shows the notes of its own folder and its direct subfolders.',
		section: 'Bases',
		create: ctx => new AutoBaseFilterFeature(ctx),
	}),
	defineFeature({
		id: 'inline-note-rename',
		name: 'Inline rename in bases',
		description: 'Rename a note from its name cell in base tables and lists, open it with a click.',
		section: 'Bases',
		create: ctx => new InlineNoteRenameFeature(ctx),
	}),
	defineFeature({
		id: 'select-property',
		name: 'Select chips',
		description: 'Select properties show as colored chips and are edited with a picker, in bases and notes.',
		section: 'Properties',
		create: ctx => new SelectPropertyFeature(ctx),
	}),
	defineFeature({
		id: 'breadcrumb-nav',
		name: 'Clickable breadcrumbs',
		description: 'Clicking a folder in the note header breadcrumb opens its folder note.',
		section: 'Folder notes',
		create: ctx => new BreadcrumbNavFeature(ctx),
	}),
	defineFeature({
		id: 'prettier',
		name: 'Format on save',
		description: 'Formats the note with Prettier on every save (Cmd+S).',
		section: 'Editor',
		defaultEnabled: false,
		create: ctx => new PrettierFeature(ctx),
	}),
	defineFeature({
		id: 'side-peek',
		name: 'Side peek',
		description: 'Notes opened from a base open in a panel on the right, over the base.',
		section: 'Bases',
		desktopOnly: true,
		create: ctx => new SidePeekFeature(ctx),
	}),
	defineFeature({
		id: 'timeline',
		name: 'Timeline view',
		description: 'A timeline view for bases: drag, resize and reorder the bars.',
		section: 'Bases',
		create: ctx => new TimelineFeature(ctx),
	}),
	defineFeature({
		id: 'tag-colors',
		name: 'Tag colors',
		description: 'Give tags a color, shared with the select chips.',
		section: 'Properties',
		create: ctx => new TagColorsFeature(ctx),
	}),
	defineFeature({
		id: 'board',
		name: 'Board view',
		description: 'A board view for bases: one column per value, drag cards between them.',
		section: 'Bases',
		create: ctx => new BoardFeature(ctx),
	}),
	defineFeature({
		id: 'title-mention',
		name: 'Mentions in titles',
		description: 'Type @ in a note title to mention another note, shown as a link chip.',
		section: 'Editor',
		create: ctx => new TitleMentionFeature(ctx),
	}),
	defineFeature({
		id: 'table-clipboard',
		name: 'Copy and paste cells',
		description: 'Cmd+C and Cmd+V on the selected cells of a base table, pasting into several cells at once.',
		section: 'Bases',
		create: ctx => new TableClipboardFeature(ctx),
	}),
	defineFeature({
		id: 'base-own-context',
		name: 'Bases keep their own context',
		description: 'A base in a tab always filters on itself (this), whatever tab has the focus.',
		section: 'Bases',
		defaultEnabled: false,
		create: ctx => new BaseOwnContextFeature(ctx),
	}),
	defineFeature({
		id: 'icons',
		name: 'Icons',
		description: 'Give notes and folders an icon and a color, shown in the explorer, tabs, headers and links.',
		section: 'Icons',
		create: ctx => new IconsFeature(ctx),
	}),
	defineFeature({
		id: 'tweak-accent',
		name: 'Grey accent',
		description: 'A grey accent color in both themes, lighter in dark mode. The accent color of the appearance settings still wins.',
		section: 'Visual tweaks',
		defaultEnabled: false,
		create: ctx => new VisualTweakFeature(ctx),
	}),
	defineFeature({
		id: 'tweak-dark-background',
		name: 'Darker dark mode',
		description: 'A near black background for notes, sidebars and tables in dark mode.',
		section: 'Visual tweaks',
		defaultEnabled: false,
		create: ctx => new VisualTweakFeature(ctx),
	}),
	defineFeature({
		id: 'tweak-typography',
		name: 'Note typography',
		description: 'Larger titles and headings, underlined links, wider note margins and code blocks that scroll instead of wrapping.',
		section: 'Visual tweaks',
		defaultEnabled: false,
		create: ctx => new VisualTweakFeature(ctx),
	}),
	defineFeature({
		id: 'tweak-tabs',
		name: 'Raised active tab',
		description: 'The active tab of the main area looks raised instead of recessed.',
		section: 'Visual tweaks',
		defaultEnabled: false,
		create: ctx => new VisualTweakFeature(ctx),
	}),
	defineFeature({
		id: 'tweak-properties',
		name: 'Plain properties',
		description: 'Properties without background or placeholder, plain date inputs and pills that keep their descenders.',
		section: 'Visual tweaks',
		defaultEnabled: false,
		create: ctx => new VisualTweakFeature(ctx),
	}),
	defineFeature({
		id: 'tweak-bases-layout',
		name: 'Bases layout',
		description: 'Bases aligned on the note margins, with taller table rows, borderless headers and denser lists.',
		section: 'Visual tweaks',
		defaultEnabled: false,
		create: ctx => new VisualTweakFeature(ctx),
	}),
];
