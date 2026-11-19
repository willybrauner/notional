import { App, Editor, MarkdownView } from 'obsidian';
import prettier from 'prettier';
import markdownPlugin from 'prettier/plugins/markdown';
import { Feature } from '../../core/Feature';

type CheckCallback = (checking: boolean) => boolean | void;

interface AppWithCommands extends App {
	commands: {
		commands: Record<string, { checkCallback: CheckCallback } | undefined>;
	};
}

// Formats the active note with Prettier on every save (Cmd+S)
export class PrettierFeature extends Feature {
	private originalSaveCallback: CheckCallback | undefined;

	onload() {
		this.hookSaveCommand();
	}

	private hookSaveCommand() {
		const appCommands = (this.app as AppWithCommands).commands;
		const saveCommand = appCommands?.commands?.['editor:save-file'];
		if (!saveCommand?.checkCallback) return;

		const original = saveCommand.checkCallback;
		this.originalSaveCallback = original;

		saveCommand.checkCallback = (checking: boolean) => {
			if (checking) return original(checking);

			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) {
				void this.formatAndSave(view.editor);
			} else {
				original(false);
			}
		};

		// Restores the native save command when the feature is turned off
		this.register(() => {
			saveCommand.checkCallback = original;
		});
	}

	private async formatAndSave(editor: Editor): Promise<void> {
		try {
			await this.formatEditor(editor);
		} finally {
			this.originalSaveCallback!(false);
		}
	}

	private async formatEditor(editor: Editor): Promise<void> {
		const content = editor.getValue();

		const formatted = await prettier.format(content, {
			parser: 'markdown',
			plugins: [markdownPlugin],
			proseWrap: 'preserve',
			printWidth: 80,
		});

		if (formatted === content) return;

		const cursor = editor.getCursor();
		const { left, top } = editor.getScrollInfo();

		editor.setValue(formatted);
		editor.scrollTo(left, top);
		editor.setCursor(cursor);
	}
}
