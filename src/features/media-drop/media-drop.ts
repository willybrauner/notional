import {
	Editor,
	Notice,
	TFile,
	View,
	WorkspaceLeaf,
} from 'obsidian';
import { Feature } from '../../core/Feature';
import { MEDIA_EXTENSIONS } from './constants';
import { convertImageToWebp } from './convertImageToWebp';
import { isConvertible } from './isConvertible';
import { isHeic } from './isHeic';
import { resolveAssetPath } from './resolveAssetPath';
import { slugifyFilename } from './slugifyFilename';
import { safeFilename } from './safeFilename';

interface ObsidianInternals {
	internalPlugins?: {
		plugins?: {
			'daily-notes'?: {
				instance?: { options?: { folder?: string } };
			};
		};
	};
}

interface MarkdownView extends View {
	editor: Editor;
	file: TFile | null;
	containerEl: HTMLElement;
}

export class MediaDropFeature extends Feature {
	// View containers already listened to (listeners removed with the feature)
	private listenerElements = new WeakSet<HTMLElement>();

	onload() {
		this.onLayoutReady(() => {
			this.attachListeners();
		});

		this.registerEvent(
			this.app.workspace.on('layout-change', () => {
				this.attachListeners();
			})
		);
	}

	private attachListeners() {
		const leaves = this.app.workspace.getLeavesOfType('markdown');
		leaves.forEach(leaf => {
			const view = leaf.view as MarkdownView;
			const container = view?.containerEl;
			if (container && !this.listenerElements.has(container)) {
				this.listenerElements.add(container);
				this.registerDomEvent(container, 'drop', (event: DragEvent) => {
					void this.handleMediaDrop(event, leaf);
				}, { capture: true });
				this.registerDomEvent(container, 'paste', (event: ClipboardEvent) => {
					void this.handleMediaPaste(event, leaf);
				}, { capture: true });
			}
		});
	}

	private isInDailyFolder(file: TFile): boolean {
		const internals = this.app as unknown as ObsidianInternals;
		const dailyFolder = internals.internalPlugins?.plugins?.['daily-notes']?.instance?.options?.folder?.trim() ?? '';
		if (!dailyFolder) return false;
		const filePath = file.path;
		return filePath === `${dailyFolder}/${file.name}` || filePath.startsWith(`${dailyFolder}/`);
	}

	private isMediaFile(filename: string): boolean {
		const ext = filename.split('.').pop()?.toLowerCase() ?? '';
		return MEDIA_EXTENSIONS.has(ext);
	}

	private async handleMediaDrop(event: DragEvent, leaf: WorkspaceLeaf): Promise<void> {
		const dataTransfer = event.dataTransfer;
		if (!dataTransfer) return;
		await this.handleFiles(dataTransfer.files, event, leaf);
	}

	private async handleMediaPaste(event: ClipboardEvent, leaf: WorkspaceLeaf): Promise<void> {
		const clipboardData = event.clipboardData;
		if (!clipboardData) return;
		await this.handleFiles(clipboardData.files, event, leaf);
	}

	private async handleFiles(
		files: FileList,
		event: DragEvent | ClipboardEvent,
		leaf: WorkspaceLeaf
	): Promise<void> {
		if (files.length === 0) return;

		const view = leaf.view as MarkdownView;
		const currentFile = view?.file;
		if (!currentFile) return;

		const isDaily = this.isInDailyFolder(currentFile);

		const eligibleFiles: File[] = [];
		for (let i = 0; i < files.length; i++) {
			const candidate = files.item(i);
			if (!candidate || !this.isMediaFile(candidate.name)) continue;
			// Daily notes keep Obsidian's default handling for anything
			// that isn't a convertible image (mp4, pdf, gif, existing webp...).
			if (isDaily && !isConvertible(candidate.name)) continue;
			eligibleFiles.push(candidate);
		}
		if (eligibleFiles.length === 0) return;

		// Must run synchronously, before any await below, otherwise Obsidian's
		// own drop/paste handler has already run by the time this resolves.
		event.preventDefault();
		event.stopPropagation();

		for (const mediaFile of eligibleFiles) {
			try {
				await this.processMediaFile(mediaFile, leaf, currentFile, isDaily);
			} catch (error) {
				new Notice(`Media drop error: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
	}

	private async processMediaFile(
		droppedFile: File,
		leaf: WorkspaceLeaf,
		currentFile: TFile,
		isDaily: boolean
	): Promise<void> {
		const { convertImagesToWebp, webpQuality, convertHeic } = this.ctx.settings.get();
		const shouldConvert = convertImagesToWebp && isConvertible(droppedFile.name)
			&& (convertHeic || !isHeic(droppedFile.name));

		let bytes: ArrayBuffer;
		let filename = safeFilename(droppedFile.name);

		if (shouldConvert) {
			try {
				const webpBlob = await convertImageToWebp(droppedFile, webpQuality / 100);
				bytes = await webpBlob.arrayBuffer();
				const dotIndex = filename.lastIndexOf('.');
				const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
				// A name made of non-ASCII characters only slugifies to nothing (".webp", a hidden file)
				filename = `${slugifyFilename(base) || 'image'}.webp`;
			} catch (error) {
				new Notice(`WebP conversion failed, keeping original: ${error instanceof Error ? error.message : String(error)}`);
				bytes = await droppedFile.arrayBuffer();
			}
		} else {
			bytes = await droppedFile.arrayBuffer();
		}

		const mediaPath = await resolveAssetPath(this.app, currentFile, filename, isDaily);
		await this.app.vault.createBinary(mediaPath, bytes);

		const mediaFile = this.app.vault.getAbstractFileByPath(mediaPath);
		if (mediaFile instanceof TFile) {
			const view = leaf.view as MarkdownView;
			const editor = view?.editor;
			if (!editor) return;

			const link = this.app.fileManager.generateMarkdownLink(
				mediaFile,
				currentFile.path
			);
			const cursor = editor.getCursor();
			editor.replaceRange(link + '\n', cursor);
		}
	}
}
