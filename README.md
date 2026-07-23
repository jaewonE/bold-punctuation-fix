# Bold Punctuation Fix

[ [English](https://github.com/jaewonE/bold-punctuation-fix) | [한국어](https://github.com/jaewonE/bold-punctuation-fix/blob/master/README.ko.md) ]

Bold Punctuation Fix is an Obsidian plugin that repairs Markdown bold spans whose boundary punctuation makes `**` delimiters parse incorrectly. It uses Markdown-only source replacements and never inserts HTML tags.

## Features

- Fixes the current note on demand; it does not watch the editor or scan the vault.
- Moves leading and trailing punctuation outside an unsafe `**...**` span.
- Converts `I said **"hello"** to everyone.` to `I said "**hello**" to everyone.`.
- Supports ASCII, typographic, and CJK punctuation.
- Leaves normal strong spans unchanged when their surrounding context is already valid.
- Skips YAML frontmatter, fenced code blocks, inline code, escaped delimiters, Markdown links, Wikilinks, and `***` delimiter runs.
- Keeps the source length unchanged, so a replacement is one predictable editor edit.

## How it works

The command identifies literal, exact `**...**` spans outside protected Markdown regions. If either delimiter is unsafe because punctuation is adjacent to text, all movable boundary punctuation is placed outside the bold span. Only the inner text remains bold.

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

1. Open the Markdown note to repair.
2. Open the Command Palette.
3. Run **Fix punctuation-bound bold syntax in current note**.
4. Review the resulting Markdown before saving.

The command only changes the active editor. If a result is not wanted, use Obsidian's **Undo** immediately. For important notes, retain your normal vault backup or version-history workflow before applying any text transformation.

## Commands and hotkeys

| Command | Default hotkey |
| --- | --- |
| Fix punctuation-bound bold syntax in current note | None |

You can assign a shortcut in **Settings → Hotkeys**.

## Settings

Version `1.0.2` has no settings. The plugin stores no configuration or note data.

## Privacy and network access

Bold Punctuation Fix runs entirely locally.

- It makes no network requests and uses no telemetry.
- It does not read files outside the current vault.
- It does not scan the vault or run in the background.
- When invoked, it reads the active editor text and replaces only that editor's text.

## Mobile and desktop support

`isDesktopOnly` is `false`. The command uses only mobile-compatible Obsidian editor APIs and can be run from the mobile command palette.

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
