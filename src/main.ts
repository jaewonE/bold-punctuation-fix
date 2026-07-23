import { Editor, MarkdownView, Plugin } from 'obsidian';
import { isAutoFixTrigger, transformMarkdownLine } from './transform';

const AUTO_FIX_DELAY_MS = 350;

interface LastAutoFix {
	line: number;
	original: string;
}

export default class BoldPunctuationFixPlugin extends Plugin {
	private readonly pendingAutoFixes = new Map<Editor, number>();
	private readonly autoApplyingEditors = new WeakSet<Editor>();
	private readonly lastAutoFixes = new WeakMap<Editor, LastAutoFix>();

	onload(): void {
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor, info) => {
				if (this.autoApplyingEditors.has(editor)) {
					return;
				}

				if (info instanceof MarkdownView && info.getMode() !== 'source') {
					return;
				}

				if (this.wasJustUndone(editor)) {
					return;
				}

				const triggerLine = this.getTriggerLine(editor);
				if (triggerLine === null) {
					return;
				}

				this.queueAutoFix(editor, triggerLine);
			}),
		);

		this.register(() => {
			for (const timer of this.pendingAutoFixes.values()) {
				window.clearTimeout(timer);
			}
			this.pendingAutoFixes.clear();
		});
	}

	private wasJustUndone(editor: Editor): boolean {
		const lastAutoFix = this.lastAutoFixes.get(editor);
		if (!lastAutoFix) {
			return false;
		}

		this.lastAutoFixes.delete(editor);
		return (
			lastAutoFix.line < editor.lineCount() &&
			editor.getLine(lastAutoFix.line) === lastAutoFix.original
		);
	}

	private getTriggerLine(editor: Editor): number | null {
		const selections = editor.listSelections();
		if (selections.length !== 1) {
			return null;
		}

		const selection = selections[0]!;
		if (
			selection.anchor.line !== selection.head.line ||
			selection.anchor.ch !== selection.head.ch
		) {
			return null;
		}

		const cursor = editor.getCursor();
		return isAutoFixTrigger(editor.getLine(cursor.line), cursor.ch) ? cursor.line : null;
	}

	private queueAutoFix(editor: Editor, line: number): void {
		const pendingTimer = this.pendingAutoFixes.get(editor);
		if (pendingTimer !== undefined) {
			window.clearTimeout(pendingTimer);
		}

		const timer = window.setTimeout(() => {
			const latest = this.pendingAutoFixes.get(editor);
			if (latest !== timer) {
				return;
			}

			this.pendingAutoFixes.delete(editor);
			this.applyAutoFix(editor, line);
		}, AUTO_FIX_DELAY_MS);
		this.pendingAutoFixes.set(editor, timer);
	}

	private applyAutoFix(editor: Editor, line: number): void {
		const selection = editor.listSelections();
		const cursor = editor.getCursor();
		if (
			selection.length !== 1 ||
			selection[0]!.anchor.line !== selection[0]!.head.line ||
			selection[0]!.anchor.ch !== selection[0]!.head.ch ||
			cursor.line !== line
		) {
			return;
		}

		const original = editor.getLine(line);
		const result = transformMarkdownLine(editor, line);
		if (result.replacements === 0) {
			return;
		}

		this.lastAutoFixes.set(editor, {
			line,
			original,
		});
		this.autoApplyingEditors.add(editor);
		try {
			editor.replaceRange(result.text, { line, ch: 0 }, { line, ch: original.length }, 'bold-punctuation-fix');
		} finally {
			queueMicrotask(() => this.autoApplyingEditors.delete(editor));
		}
	}
}
