export interface TransformResult {
	text: string;
	replacements: number;
}

interface ProtectedRange {
	start: number;
	end: number;
}

export interface MarkdownLineSource {
	getLine(line: number): string;
	lineCount(): number;
}

const ASCII_PUNCTUATION = /^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]$/;
const UNICODE_PUNCTUATION = /^\p{P}$/u;
const WHITESPACE = /^\s$/u;

/**
 * Moves punctuation out of a literal **strong** span when the surrounding
 * characters make Obsidian's Markdown delimiter parser reject that span.
 *
 * The transformation is deliberately conservative. Protected Markdown
 * regions and boundary markers that may form another Markdown construct are
 * left untouched.
 */
export function transformMarkdown(text: string): TransformResult {
	const protectedRanges = findProtectedRanges(text);
	return rewriteStrongSpans(
		text,
		protectedRanges,
		(opening) => previousCodePoint(text, opening),
		(closing) => nextCodePoint(text, closing + 2),
	);
}

/**
 * Returns whether an edit immediately follows a completed strong delimiter.
 * This cheap check avoids scanning the document for ordinary typing.
 */
export function isAutoFixTrigger(line: string, cursorCh: number): boolean {
	return (
		(cursorCh >= 2 && line[cursorCh - 2] === '*' && line[cursorCh - 1] === '*') ||
		(cursorCh >= 3 && line[cursorCh - 3] === '*' && line[cursorCh - 2] === '*')
	);
}

/**
 * Transforms one physical line while preserving the document-level protection
 * of YAML frontmatter and fenced code blocks. The caller supplies the editor
 * as a line source, so no full-note copy or persistent document cache is kept.
 */
export function transformMarkdownLine(
	source: MarkdownLineSource,
	line: number,
): TransformResult {
	if (line < 0 || line >= source.lineCount()) {
		return { text: '', replacements: 0 };
	}

	const text = source.getLine(line);
	if (isProtectedDocumentLine(source, line)) {
		return { text, replacements: 0 };
	}

	const protectedRanges = findProtectedRanges(text);
	return rewriteStrongSpans(
		text,
		protectedRanges,
		(opening) => (opening === 0 && line > 0 ? '\n' : previousCodePoint(text, opening)),
		(closing) =>
			closing + 2 === text.length && line + 1 < source.lineCount()
				? '\n'
				: nextCodePoint(text, closing + 2),
	);
}

/**
 * Transforms an inclusive range of physical lines. This is used for pasted
 * content so the plugin avoids scanning or replacing the rest of the note.
 */
export function transformMarkdownLines(
	source: MarkdownLineSource,
	fromLine: number,
	toLine: number,
): TransformResult {
	const firstLine = Math.max(0, Math.min(fromLine, toLine));
	const lastLine = Math.min(source.lineCount() - 1, Math.max(fromLine, toLine));
	if (firstLine > lastLine) {
		return { text: '', replacements: 0 };
	}

	const output: string[] = [];
	let replacements = 0;
	for (let line = firstLine; line <= lastLine; line += 1) {
		const result = transformMarkdownLine(source, line);
		output.push(result.text);
		replacements += result.replacements;
	}

	return { text: output.join('\n'), replacements };
}

function rewriteStrongSpans(
	text: string,
	protectedRanges: ProtectedRange[],
	beforeOpening: (opening: number) => string | undefined,
	afterClosing: (closing: number) => string | undefined,
): TransformResult {
	const delimiters = collectStrongDelimiters(text, protectedRanges);
	const output: string[] = [];
	let cursor = 0;
	let replacements = 0;

	for (let index = 0; index + 1 < delimiters.length; index += 2) {
		const opening = delimiters[index]!;
		const closing = delimiters[index + 1]!;
		const original = text.slice(opening, closing + 2);
		const replacement = rewriteStrongSpan(
			original,
			beforeOpening(opening),
			afterClosing(closing),
		);

		if (replacement === original) {
			continue;
		}

		output.push(text.slice(cursor, opening), replacement);
		cursor = closing + 2;
		replacements += 1;
	}

	if (replacements === 0) {
		return { text, replacements };
	}

	output.push(text.slice(cursor));
	return { text: output.join(''), replacements };
}

function isProtectedDocumentLine(source: MarkdownLineSource, line: number): boolean {
	return isLineInFrontmatter(source, line) || isLineInFencedCodeBlock(source, line);
}

function isLineInFrontmatter(source: MarkdownLineSource, line: number): boolean {
	if (source.lineCount() === 0 || source.getLine(0) !== '---') {
		return false;
	}

	for (let index = 1; index < source.lineCount(); index += 1) {
		const value = source.getLine(index).trim();
		if (value === '---' || value === '...') {
			return line <= index;
		}
	}

	return false;
}

function isLineInFencedCodeBlock(source: MarkdownLineSource, targetLine: number): boolean {
	let fence: { character: string; length: number } | undefined;

	for (let line = 0; line <= targetLine; line += 1) {
		const value = source.getLine(line);
		if (fence) {
			if (line === targetLine) {
				return true;
			}

			if (isClosingFence(value, fence)) {
				fence = undefined;
			}
			continue;
		}

		const openingFence = value.match(/^ {0,3}(`{3,}|~{3,})/u);
		if (!openingFence) {
			continue;
		}

		if (line === targetLine) {
			return true;
		}

		fence = {
			character: openingFence[1]![0]!,
			length: openingFence[1]!.length,
		};
	}

	return false;
}

function isClosingFence(
	line: string,
	fence: { character: string; length: number },
): boolean {
	const closingPattern = new RegExp(
		`^ {0,3}${escapeForRegex(fence.character)}{${fence.length},}\\s*$`,
		'u',
	);
	return closingPattern.test(line);
}

function rewriteStrongSpan(
	original: string,
	beforeOpening: string | undefined,
	afterClosing: string | undefined,
): string {
	const content = original.slice(2, -2);

	if (containsProtectedInlineSyntax(content)) {
		return original;
	}

	const characters = Array.from(content);
	const leadingEnd = countLeadingMovablePunctuation(characters);
	const trailingStart = countTrailingMovablePunctuation(characters, leadingEnd);

	if (leadingEnd === 0 && trailingStart === characters.length) {
		return original;
	}

	const unsafeOpening =
		leadingEnd > 0 && isNonPunctuationText(beforeOpening);
	const unsafeClosing =
		trailingStart < characters.length && isNonPunctuationText(afterClosing);

	if (!unsafeOpening && !unsafeClosing) {
		return original;
	}

	const core = characters.slice(leadingEnd, trailingStart).join('');
	if (core.length === 0 || /^\s*$/u.test(core)) {
		return original;
	}

	const leading = characters.slice(0, leadingEnd).join('');
	const trailing = characters.slice(trailingStart).join('');
	return `${leading}**${core}**${trailing}`;
}

function containsProtectedInlineSyntax(content: string): boolean {
	return (
		content.includes('\\') ||
		content.includes('`') ||
		content.includes('\n') ||
		content.includes('\r') ||
		/!?\[[^\]\n]*\]\([^)\n]*\)/u.test(content) ||
		/!?\[\[[^\]\n]*\]\]/u.test(content)
	);
}

function countLeadingMovablePunctuation(characters: string[]): number {
	let index = 0;
	while (index < characters.length && isMovablePunctuation(characters[index]!)) {
		index += 1;
	}
	return index;
}

function countTrailingMovablePunctuation(
	characters: string[],
	leadingEnd: number,
): number {
	let index = characters.length;
	while (index > leadingEnd && isMovablePunctuation(characters[index - 1]!)) {
		index -= 1;
	}
	return index;
}

function isMovablePunctuation(character: string): boolean {
	if (character === '*' || character === '_' || character === '\\' || character === '`') {
		return false;
	}
	return isBoundaryPunctuation(character);
}

function isNonPunctuationText(character: string | undefined): boolean {
	return (
		character !== undefined &&
		!WHITESPACE.test(character) &&
		!isBoundaryPunctuation(character)
	);
}

function isBoundaryPunctuation(character: string): boolean {
	return ASCII_PUNCTUATION.test(character) || UNICODE_PUNCTUATION.test(character);
}

function collectStrongDelimiters(
	text: string,
	protectedRanges: ProtectedRange[],
): number[] {
	const delimiters: number[] = [];
	let rangeIndex = 0;

	for (let index = 0; index < text.length; index += 1) {
		while (
			rangeIndex < protectedRanges.length &&
			index >= protectedRanges[rangeIndex]!.end
		) {
			rangeIndex += 1;
		}

		const range = protectedRanges[rangeIndex];
		if (range && index >= range.start) {
			index = range.end - 1;
			continue;
		}

		if (isExactStrongDelimiter(text, index) && !isEscaped(text, index)) {
			delimiters.push(index);
			index += 1;
		}
	}

	return delimiters;
}

function isExactStrongDelimiter(text: string, index: number): boolean {
	return (
		text.startsWith('**', index) &&
		text[index - 1] !== '*' &&
		text[index + 2] !== '*'
	);
}

function isEscaped(text: string, index: number): boolean {
	let backslashes = 0;
	for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
		backslashes += 1;
	}
	return backslashes % 2 === 1;
}

function findProtectedRanges(text: string): ProtectedRange[] {
	const blockRanges: ProtectedRange[] = [];
	const frontmatterEnd = findFrontmatterEnd(text);
	if (frontmatterEnd > 0) {
		blockRanges.push({ start: 0, end: frontmatterEnd });
	}

	for (let lineStart = 0; lineStart < text.length; ) {
		const lineEnd = findLineEnd(text, lineStart);
		const line = text.slice(lineStart, lineEnd);
		const openingFence = line.match(/^ {0,3}(`{3,}|~{3,})/u);

		if (!openingFence) {
			lineStart = lineEnd + 1;
			continue;
		}

		const fence = openingFence[1]!;
		const fenceCharacter = fence[0]!;
		const closingPattern = new RegExp(
			`^ {0,3}${escapeForRegex(fenceCharacter)}{${fence.length},}\\s*$`,
			'u',
		);
		let closingEnd = text.length;

		for (let candidateStart = lineEnd + 1; candidateStart < text.length; ) {
			const candidateEnd = findLineEnd(text, candidateStart);
			if (closingPattern.test(text.slice(candidateStart, candidateEnd))) {
				closingEnd = Math.min(candidateEnd + 1, text.length);
				break;
			}
			candidateStart = candidateEnd + 1;
		}

		blockRanges.push({ start: lineStart, end: closingEnd });
		lineStart = closingEnd;
	}

	const sortedBlockRanges = mergeRanges(blockRanges);
	const inlineRanges: ProtectedRange[] = [];
	let blockRangeIndex = 0;

	for (let index = 0; index < text.length; index += 1) {
		while (
			blockRangeIndex < sortedBlockRanges.length &&
			index >= sortedBlockRanges[blockRangeIndex]!.end
		) {
			blockRangeIndex += 1;
		}

		const blockRange = sortedBlockRanges[blockRangeIndex];
		if (blockRange && index >= blockRange.start) {
			index = blockRange.end - 1;
			continue;
		}

		if (text[index] !== '`') {
			continue;
		}

		let runLength = 1;
		while (text[index + runLength] === '`') {
			runLength += 1;
		}

		const delimiter = '`'.repeat(runLength);
		const closing = text.indexOf(delimiter, index + runLength);
		if (closing !== -1) {
			inlineRanges.push({ start: index, end: closing + runLength });
			index = closing + runLength - 1;
		}
	}

	return mergeRanges([...sortedBlockRanges, ...inlineRanges]);
}

function findFrontmatterEnd(text: string): number {
	if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
		return 0;
	}

	const firstLineEnd = findLineEnd(text, 0);
	for (let lineStart = firstLineEnd + 1; lineStart < text.length; ) {
		const lineEnd = findLineEnd(text, lineStart);
		const line = text.slice(lineStart, lineEnd).trim();
		if (line === '---' || line === '...') {
			return Math.min(lineEnd + 1, text.length);
		}
		lineStart = lineEnd + 1;
	}

	return 0;
}

function findLineEnd(text: string, start: number): number {
	const lineFeed = text.indexOf('\n', start);
	return lineFeed === -1 ? text.length : lineFeed;
}

function mergeRanges(ranges: ProtectedRange[]): ProtectedRange[] {
	return ranges
		.filter((range) => range.start < range.end)
		.sort((left, right) => left.start - right.start)
		.reduce<ProtectedRange[]>((merged, range) => {
			const previous = merged[merged.length - 1];
			if (previous && range.start <= previous.end) {
				previous.end = Math.max(previous.end, range.end);
				return merged;
			}
			merged.push({ ...range });
			return merged;
		}, []);
}

function previousCodePoint(text: string, index: number): string | undefined {
	if (index === 0) {
		return undefined;
	}

	const previous = text.charCodeAt(index - 1);
	if (previous >= 0xdc00 && previous <= 0xdfff && index >= 2) {
		return text.slice(index - 2, index);
	}
	return text[index - 1];
}

function nextCodePoint(text: string, index: number): string | undefined {
	if (index >= text.length) {
		return undefined;
	}

	const current = text.charCodeAt(index);
	if (current >= 0xd800 && current <= 0xdbff && index + 1 < text.length) {
		return text.slice(index, index + 2);
	}
	return text[index];
}

function escapeForRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}
