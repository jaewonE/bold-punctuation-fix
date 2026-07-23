import { Editor, Notice, Plugin } from 'obsidian';
import { transformMarkdown } from './transform';

export default class BoldPunctuationFixPlugin extends Plugin {
	onload(): void {
		this.addCommand({
			id: 'fix-punctuation-bound-bold-syntax',
			name: 'Fix punctuation-bound bold syntax in current note',
			editorCallback: (editor: Editor) => {
				const result = transformMarkdown(editor.getValue());

				if (result.replacements === 0) {
					new Notice('No punctuation-bound bold syntax found.');
					return;
				}

				editor.setValue(result.text);
				new Notice(
					`Fixed ${result.replacements} punctuation-bound bold ${result.replacements === 1 ? 'span' : 'spans'}.`,
				);
			},
		});
	}
}
