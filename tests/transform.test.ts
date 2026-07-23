import assert from 'node:assert/strict';
import test from 'node:test';
import { transformMarkdown } from '../src/transform';

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
