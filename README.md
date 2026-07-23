# Bold Punctuation Fix

[ [English](https://github.com/jaewonE/bold-punctuation-fix) | [한국어](https://github.com/jaewonE/bold-punctuation-fix/blob/master/README.ko.md) ]

Bold Punctuation Fix is an Obsidian plugin that automatically repairs Markdown bold spans whose boundary punctuation makes `**` delimiters parse incorrectly while you type. It uses Markdown-only source replacements and never inserts HTML tags.

## Features

- Automatically fixes only the edited line after a completed `**` delimiter or text immediately following it.
- Waits 350 ms after relevant typing stops, without a command or a setting to enable the behavior.
- Moves leading and trailing punctuation outside an unsafe `**...**` span.
- Converts `I said **"hello"** to everyone.` to `I said "**hello**" to everyone.`.
- Supports ASCII, typographic, and CJK punctuation.
- Leaves normal strong spans unchanged when their surrounding context is already valid.
- Skips YAML frontmatter, fenced code blocks, inline code, escaped delimiters, Markdown links, Wikilinks, and `***` delimiter runs.
- Keeps the source length unchanged, so a replacement is one predictable editor edit.

## How it works

After relevant typing pauses, the plugin identifies literal, exact `**...**` spans on the active line outside protected Markdown regions. If either delimiter is unsafe because punctuation is adjacent to text, all movable boundary punctuation is placed outside the bold span. Only the inner text remains bold.

Examples:

```markdown
I said **"hello"** to everyone.
Plan**(today)**
**[Reminder]** on the board
```

becomes:

```markdown
I said "**hello**" to everyone.
Plan(**today**)
[**Reminder**] on the board
```

`™`, `©`, and emoji are not treated as punctuation boundaries by this transformation. The plugin also deliberately leaves boundary `*`, `_`, backslashes, and backticks untouched because they can form other Markdown syntax.

## Usage

1. Enable Bold Punctuation Fix.
2. Type a punctuation-bound bold span in a Markdown editor.
3. Finish the closing `**`, or type text immediately after it.
4. After 350 ms without relevant typing, review the automatic correction.

The plugin changes only the active editor line that triggered the correction. If a result is not wanted, use Obsidian's **Undo** immediately. The plugin recognizes that undo and does not immediately reapply the same correction. For important notes, retain your normal vault backup or version-history workflow before applying any text transformation.

## Privacy and network access

Bold Punctuation Fix runs entirely locally.

- It makes no network requests and uses no telemetry.
- It does not read files outside the current vault.
- It does not scan the vault or poll in the background.
- It observes the active Markdown editor after relevant input and replaces only the affected line.
- It stores no settings or note data; pending timers and undo guards are kept only in memory for open editors.

## Mobile and desktop support

`isDesktopOnly` is `false`. The plugin uses mobile-compatible Obsidian editor APIs and supports Obsidian `1.1.1` and later on both mobile and desktop.

## Installation

### From Community Plugins

After the plugin is accepted into the Obsidian Community Plugins directory:

1. Open **Settings → Community plugins**.
2. Search for **Bold Punctuation Fix**.
3. Install and enable the plugin.

### Manual installation

Download these files from a GitHub release:

- `main.js`
- `manifest.json`
- `styles.css`

Copy them into:

```text
<Vault>/.obsidian/plugins/bold-punctuation-fix/
```

Reload Obsidian, then enable **Bold Punctuation Fix** in **Settings → Community plugins**.

## Development

```bash
npm install
npm test
npm run lint
npm run build
```

## License

GNU General Public License v3.0 only. See [LICENSE](LICENSE).
