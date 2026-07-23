import { Editor, EditorPosition, MarkdownView, Plugin, TFile } from 'obsidian';
import {
	isAutoFixTrigger,
	transformMarkdown,
	transformMarkdownLine,
	transformMarkdownLines,
} from './transform';

const AUTO_FIX_DELAY_MS = 350;

interface LastAutoFix {
	line: number;
	original: string;
}

interface PendingPasteFix {
	timer: number;
}

export default class BoldPunctuationFixPlugin extends Plugin {
	private readonly pendingAutoFixes = new Map<Editor, number>();
	private readonly pendingPasteFixes = new Map<Editor, PendingPasteFix>();
	private readonly autoApplyingEditors = new WeakSet<Editor>();
	private readonly lastAutoFixes = new WeakMap<Editor, LastAutoFix>();
	private documentFixTimer: number | undefined;

	onload(): void {
		this.registerEvent(
			this.app.workspace.on('editor-change', (editor, info) => {
				if (this.autoApplyingEditors.has(editor)) {
					return;
				}

				if (info instanceof MarkdownView && info.getMode() !== 'source') {
					return;
				}

				if (this.pendingPasteFixes.has(editor)) {
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

		this.registerEvent(
			this.app.workspace.on('editor-paste', (event, editor, info) => {
				if (
					event.defaultPrevented ||
					this.autoApplyingEditors.has(editor) ||
					(info instanceof MarkdownView && info.getMode() !== 'source')
				) {
					return;
				}

				const clipboardData = event.clipboardData;
				if (
					editor.listSelections().length !== 1 ||
					!clipboardData ||
					!Array.from(clipboardData.types).includes('text/plain')
				) {
					return;
				}

				const from = editor.getCursor('from');
				const to = editor.getCursor('to');
				const pastedText = clipboardData.getData('text/plain');
				const pasteEnd = positionAfterText(from, pastedText);
				this.queuePasteFix(editor, from, pasteEnd);
				event.preventDefault();
				editor.replaceRange(pastedText, from, to, 'paste');
				editor.setCursor(pasteEnd);
			}),
		);

		this.registerEvent(
			this.app.workspace.on('file-open', () => this.queueActiveDocumentFix()),
		);
		this.app.workspace.onLayoutReady(() => this.queueActiveDocumentFix());

		this.register(() => {
			for (const timer of this.pendingAutoFixes.values()) {
				window.clearTimeout(timer);
			}
			this.pendingAutoFixes.clear();
			for (const { timer } of this.pendingPasteFixes.values()) {
				window.clearTimeout(timer);
			}
			this.pendingPasteFixes.clear();
			if (this.documentFixTimer !== undefined) {
				window.clearTimeout(this.documentFixTimer);
				this.documentFixTimer = undefined;
			}
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
		this.replaceRangePreservingSelections(
			editor,
			result.text,
			{ line, ch: 0 },
			{ line, ch: original.length },
		);
	}

	private queuePasteFix(editor: Editor, from: EditorPosition, to: EditorPosition): void {
		const pending = this.pendingPasteFixes.get(editor);
		if (pending) {
			window.clearTimeout(pending.timer);
		}

		const timer = window.setTimeout(() => {
			const latest = this.pendingPasteFixes.get(editor);
			if (!latest || latest.timer !== timer) {
				return;
			}

			this.pendingPasteFixes.delete(editor);
			this.applyPastedRangeFix(editor, from, to);
		}, 0);
		this.pendingPasteFixes.set(editor, { timer });
	}

	private applyPastedRangeFix(
		editor: Editor,
		from: EditorPosition,
		to: EditorPosition,
	): void {
		const firstLine = Math.min(from.line, to.line);
		const lastLine = Math.max(from.line, to.line);
		const originalLastLine = editor.getLine(lastLine);
		const result = transformMarkdownLines(editor, firstLine, lastLine);
		if (result.replacements === 0) {
			return;
		}

		this.replaceRangePreservingSelections(
			editor,
			result.text,
			{ line: firstLine, ch: 0 },
			{ line: lastLine, ch: originalLastLine.length },
		);
	}

	private queueActiveDocumentFix(): void {
		if (this.documentFixTimer !== undefined) {
			window.clearTimeout(this.documentFixTimer);
		}

		this.documentFixTimer = window.setTimeout(() => {
			this.documentFixTimer = undefined;
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (!view || !view.file) {
				return;
			}

			if (view.getMode() === 'source') {
				this.applyOpenedEditorFix(view.editor);
				return;
			}

			this.applyOpenedFileFix(view.file);
		}, 0);
	}

	private applyOpenedEditorFix(editor: Editor): void {
		const original = editor.getValue();
		const result = transformMarkdown(original);
		if (result.replacements === 0) {
			return;
		}

		const lastLine = editor.lineCount() - 1;
		this.replaceRangePreservingSelections(
			editor,
			result.text,
			{ line: 0, ch: 0 },
			{ line: lastLine, ch: editor.getLine(lastLine).length },
		);
	}

	private applyOpenedFileFix(file: TFile): void {
		void this.app.vault.process(file, (text) => transformMarkdown(text).text);
	}

	private replaceRangePreservingSelections(
		editor: Editor,
		replacement: string,
		from: EditorPosition,
		to: EditorPosition,
	): void {
		const original = editor.getRange(from, to);
		if (replacement.length !== original.length) {
			return;
		}

		const selections = editor.listSelections();
		this.autoApplyingEditors.add(editor);
		try {
			editor.replaceRange(replacement, from, to, 'bold-punctuation-fix');
			editor.setSelections(selections);
		} finally {
			queueMicrotask(() => this.autoApplyingEditors.delete(editor));
		}
	}
}

function positionAfterText(start: EditorPosition, text: string): EditorPosition {
	const lines = text.replace(/\r\n?/gu, '\n').split('\n');
	if (lines.length === 1) {
		return { line: start.line, ch: start.ch + lines[0]!.length };
	}

	return {
		line: start.line + lines.length - 1,
		ch: lines[lines.length - 1]!.length,
	};
}
