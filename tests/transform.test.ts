import assert from 'node:assert/strict';
import test from 'node:test';
import {
	isAutoFixTrigger,
	transformMarkdown,
	transformMarkdownLine,
	transformMarkdownLines,
	type MarkdownLineSource,
} from '../src/transform';

function lineSource(lines: string[]): MarkdownLineSource {
	return {
		getLine: (line) => lines[line]!,
		lineCount: () => lines.length,
	};
}

test('moves quotation marks outside an unsafe strong span', () => {
	const result = transformMarkdown('나는 **"레브잇"**으로 식별했다.');

	assert.equal(result.text, '나는 "**레브잇**"으로 식별했다.');
	assert.equal(result.replacements, 1);
});

test('moves parentheses and CJK quotation marks outside unsafe strong spans', () => {
	assert.equal(
		transformMarkdown('**(레브잇)**으로').text,
		'(**레브잇**)으로',
	);
	assert.equal(
		transformMarkdown('**「레브잇」**으로').text,
		'「**레브잇**」으로',
	);
});

test('repairs an unsafe opening delimiter and moves both punctuation boundaries', () => {
	const result = transformMarkdown('가**"레브잇"**');

	assert.equal(result.text, '가"**레브잇**"');
	assert.equal(result.replacements, 1);
});

test('does not alter normal strong spans or the non-punctuation trademark symbol', () => {
	assert.equal(transformMarkdown('**레브잇**으로').replacements, 0);
	assert.equal(transformMarkdown('**"레브잇"**.').replacements, 0);
	assert.equal(transformMarkdown('**레브잇™**으로').replacements, 0);
});

test('still fixes a punctuation boundary followed by a trademark symbol', () => {
	const result = transformMarkdown('**"레브잇"**™');

	assert.equal(result.text, '"**레브잇**"™');
	assert.equal(result.replacements, 1);
});

test('leaves code, escaped delimiters, Markdown links, and delimiter runs unchanged', () => {
	const source = [
		'`**"레브잇"**으로`',
		'\\**"레브잇"**으로',
		'**[레브잇](https://example.com)**으로',
		'***레브잇***으로',
		'```md',
		'**"레브잇"**으로',
		'```',
	].join('\n');

	assert.deepEqual(transformMarkdown(source), { text: source, replacements: 0 });
});

test('is idempotent and preserves source length', () => {
	const source = '가**"레브잇"**와 **(다른 회사)**으로';
	const first = transformMarkdown(source);
	const second = transformMarkdown(first.text);

	assert.equal(first.text.length, source.length);
	assert.equal(second.text, first.text);
	assert.equal(second.replacements, 0);
});

test('processes a large note without touching its protected code spans', () => {
	const repeated = '**"레브잇"**으로 `**"코드"**으로`';
	const source = Array.from({ length: 10_000 }, () => repeated).join('\n');
	const result = transformMarkdown(source);

	assert.equal(result.replacements, 10_000);
	assert.equal(result.text.includes('`**"코드"**으로`'), true);
});

test('recognizes only delimiter-completion events as automatic-fix triggers', () => {
	assert.equal(isAutoFixTrigger('가**"레브잇"**', '가**"레브잇"**'.length), true);
	assert.equal(isAutoFixTrigger('**"레브잇"**으', '**"레브잇"**으'.length), true);
	assert.equal(isAutoFixTrigger('이미 작성한 문장', '이미 작성한 문장'.length), false);
});

test('repairs only the active line without copying the entire note', () => {
	const lines = ['첫 줄은 변경하지 않는다.', '나는 **"안녕하세요"**라고 말했다.', '마지막 줄도 유지한다.'];
	const result = transformMarkdownLine(lineSource(lines), 1);

	assert.deepEqual(result, {
		text: '나는 "**안녕하세요**"라고 말했다.',
		replacements: 1,
	});
	assert.equal(result.text.length, lines[1]!.length);
});

test('skips frontmatter and fenced code blocks during automatic line correction', () => {
	const frontmatter = ['---', 'title: **"안녕하세요"**라고', '---', '본문'];
	const fence = ['```md', '**"안녕하세요"**라고', '```', '본문'];

	assert.deepEqual(transformMarkdownLine(lineSource(frontmatter), 1), {
		text: 'title: **"안녕하세요"**라고',
		replacements: 0,
	});
	assert.deepEqual(transformMarkdownLine(lineSource(fence), 1), {
		text: '**"안녕하세요"**라고',
		replacements: 0,
	});
});

test('repairs only the pasted line range and retains protected code', () => {
	const lines = [
		'첫 줄은 유지한다.',
		'나는 **"안녕하세요"**라고 말했다.',
		'```md',
		'**"코드"**라고',
		'```',
		'**(오늘)**을 기록했다.',
		'마지막 줄은 유지한다.',
	];
	const result = transformMarkdownLines(lineSource(lines), 1, 5);

	assert.deepEqual(result, {
		text: [
			'나는 "**안녕하세요**"라고 말했다.',
			'```md',
			'**"코드"**라고',
			'```',
			'(**오늘**)을 기록했다.',
		].join('\n'),
		replacements: 2,
	});
});
