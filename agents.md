## Commands

Uses **Bun** as the runtime/package manager (not npm/npx).

```bash
bun run dev          # watch mode — builds main.js with inline sourcemaps
bun run build        # type-check then build minified production main.js
bun run typecheck    # tsc --noEmit only, no build
bun test             # run the test suite (tests/*.test.ts, via bun:test)
bun version-bump.mjs # bump version in manifest.json + versions.json, then git-add them
```

The build output is `main.js` in the repo root — this is what Obsidian loads.

Tests only cover pure logic (`src/helpers/*`) that doesn't call live Obsidian runtime APIs — the `obsidian` package is types-only (no JS implementation), so anything that constructs `Notice`/`Modal`/`MarkdownView` at runtime (i.e. `src/modules/export.class.ts`, `src/modals/*`) isn't unit-testable as-is and has no test coverage.

## Architecture

This is an **Obsidian plugin** that exports/sends Obsidian notes to Telegram via the Bot API. Entry point is `src/main.ts` → `src/plugin.class.ts` (`MyPlugin extends Plugin`).

On `onload`, the plugin instantiates a single `Export` class (`modules/export.class.ts`) that registers all ribbon icons and commands:

| Command | Ribbon icon | What it does |
|---|---|---|
| Export full page | `send` | Sends the active note (minus frontmatter) to the private chat (`chatId`) |
| Export selection | `scissors` | Sends the current selection to the private chat |
| Post to channel | `arrow-up-right` | Sends to the channel (`channelUsername`), optionally as a reply to another post, then writes post URL + pub date + status back to the note's frontmatter |
| Update post | `pencil-line` | Edits an existing channel post using the URL stored in the note's frontmatter; writes update date to frontmatter |

Every command opens an `ExportSettingsModal` (`modals/export-settings.modal.ts`) before sending, where the user picks the format (Classic/HTML vs Rich text/Markdown), toggles which related-notes sections and hashtag to include, and — for "Post to channel" — optionally supplies a reply link. **All four commands append the footer built from the modal's selections, including "Export selection"** — there is no footer-less send path.

Because the settings modal is shown before sending, the message text (`editor.getValue()`/`getSelection()`) is captured *before* the modal opens and used as-is once submitted; Obsidian's modal overlay traps focus/pointer-events so the underlying editor isn't reachable while it's open, so this isn't normally an editable window.

### Conversion pipelines

Markdown → Telegram-compatible format is handled by two pipelines in `src/helpers/`, selected per-export based on the format chosen in the modal (not tied to a fixed command anymore):

**`htmlConverter.ts`** (`convertToHTML`) — used for the "Classic"/HTML format:
```
convertWikilinks → convertLineBreaks → escapeHtmlForTelegram → ...tokenizeMethods
```

**`mdConverter.ts`** (`convertToTgMd`) — used for the "Rich text"/Markdown format:
```
convertWikilinks → convertLineBreaks → insertDividers → escapeHtmlForTelegram
```
- `insertDividers`: replaces `\n{2,}` with `\n\n---\n\n` (section divider) and single `\n` with `\n\n` (paragraph break). Needed because Telegram Markdown collapses single newlines to spaces.
- Does **not** run `tokenizeMethods` (no Markdown→HTML tag conversion).

**`telegramRequest.ts`** (`buildTelegramRequest`) — pure helper shared by `Export`'s `exec`/`execChannel`/`execUpdate`. Given the message/footer/format and a `{operation: "send" | "edit", chatId, messageId?, replyToMessageId?}`, it runs the right converter and returns `{url, body}` for the matching Telegram endpoint (`sendMessage`/`sendRichMessage`/`editMessageText`/`editRichMessage`). `disable_web_page_preview` is set on every request except `editRichMessage` (legacy behavior, preserved intentionally).

**`telegramFormat.ts`** (`resolveStoredFormat`) — narrows the `telegram_format` frontmatter value to `"html" | "md" | undefined`. Posts published before this field existed resolve to `undefined`; "Update post" shows a warning Notice in that case since the modal has to guess a default (Classic/HTML) that may not match how the post was originally sent.

### Shared helpers (`src/helpers/`)

**`converters.ts`** — three shared transform functions used by both pipelines:
- `convertWikilinks`: resolves `[[wikilinks]]` → anchor using the note's `externalLinkField` frontmatter value; marks unpublished/missing targets with emoji warnings
- `convertLineBreaks`: joins soft-wrapped continuation lines with a space; preserves code blocks and block-level elements
- `escapeHtmlForTelegram`: escapes `&` and `<` only (leaves existing HTML entities intact)

**`tokenizers.ts`** — exports `tokenizeMethods`, an ordered array of regex transforms (HTML pipeline only) converting Markdown syntax to Telegram HTML tags: `<b>`, `<i>`, `<s>`, `<code>`, `<pre>`, `<blockquote>`, `<tg-spoiler>`, etc. Also handles Obsidian callouts → `<blockquote>` with emoji prefix.

**`escapers.ts`** — low-level string escape utilities used inside the pipeline.

**`relatedBuilder.ts`** — computes the three "related notes" sections shown (and toggleable) in the export modal. `scanOtherMarkdownFiles(app, file)` does a single vault pass (all other markdown files + their frontmatter) shared across the brand/taste computations to avoid scanning twice:
- `computeBrandRelated`: notes sharing the current note's `brand` frontmatter value (supports `parent/child` brand naming — matches exact brand, then sibling sub-brands, then the parent, in that tier order), capped at 10 items
- `computeTasteRelated`: notes sharing any `taste` frontmatter value (string or array) with the current note, capped at 10 items
- `computeManualRelated`: notes listed in the current note's `related` frontmatter field (resolves `[[wikilinks]]`, `[[Note|Alias]]`, `[[Note#Section]]`, and plain note names)

All three only include notes with a non-empty `externalLinkField` value (the published Telegram link).

**`footerBuilder.ts`** — `buildFooterFromItems(options: ExportOptions, brandLabel, settings)` builds the footer string from the already-computed/user-toggled `RelatedItem` sections (it does not re-read frontmatter itself — that's `relatedBuilder.ts`'s job). Three possible sections, each independently toggleable:
- **"Більше [brandLabel]:"** — from `options.brandRelated`
- **"Схожий смак:"** — from `options.tasteRelated`
- **"Пов'язані огляди:"** — from `options.manualRelated`
- Optionally appends `settings.finalHashtag` (configurable, default `#огляди`) if `options.includeHashtag` is set
- `format: "html"` — links as `<a href="url">text</a>` (url- and hashtag-escaped), sections separated by `\n`
- `format: "md"` — links as `[text](url)` (`]` in link text escaped), prepends `\n---\n` divider before footer, sections separated by `\n\n`, hashtag's leading `#` escaped to `\#` and appended inline to the last section to avoid header interpretation

### Settings

`MyPluginSettings` (in `src/types.ts`) stores the bot token key name (secret looked up via `app.secretStorage`), chat/channel identifiers, and configurable frontmatter field names:

| Field | Purpose |
|---|---|
| `botToken` | Key name for secret storage lookup (not the token itself) |
| `chatId` | Private chat/group ID for "Export full page"/"Export selection" |
| `channelUsername` | Channel username or `-100...` ID for "Post to channel"/"Update post" |
| `externalLinkField` | Frontmatter field holding the published Telegram post URL |
| `pubDateField` | Frontmatter field written with `YYYY-MM-DD` on first publish |
| `updateDateField` | Frontmatter field written with `YYYY-MM-DD` on update |
| `statusField` | Frontmatter field updated to `publishedStatusValue` on first publish |
| `publishedStatusValue` | Value written to `statusField` after publishing |
| `finalHashtag` | Hashtag optionally appended at the end of the footer (default `#огляди`) |

Settings UI lives in `src/settings/tab.class.ts`. The bot token is stored as a **secret key name** — the actual token is retrieved at send-time via `app.secretStorage.getSecret(settings.botToken)` (Obsidian 1.11+ secrets API).
