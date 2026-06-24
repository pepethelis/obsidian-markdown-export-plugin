## Commands

Uses **Bun** as the runtime/package manager (not npm/npx).

```bash
bun run dev          # watch mode — builds main.js with inline sourcemaps
bun run build        # type-check then build minified production main.js
bun run typecheck    # tsc --noEmit only, no build
bun version-bump.mjs # bump version in manifest.json + versions.json, then git-add them
```

The build output is `main.js` in the repo root — this is what Obsidian loads. There are no tests.

## Architecture

This is an **Obsidian plugin** that exports/sends Obsidian notes to Telegram via the Bot API. Entry point is `src/main.ts` → `src/plugin.class.ts` (`MyPlugin extends Plugin`).

On `onload`, the plugin instantiates four feature modules, each of which registers its own ribbon icons and commands:

| Class | File | What it does |
|---|---|---|
| `SendToChat` | `modules/send-to-chat.class.ts` | Sends note/selection to a **private chat** as HTML (ribbon + 2 commands) |
| `SendToChatRich` | `modules/send-to-chat-rich.class.ts` | Same, but uses the `sendRichMessage` endpoint with Telegram Markdown |
| `PostCreate` | `modules/post-create.class.ts` | Sends to a **channel**, prompts for optional reply link, then writes post URL + pub date + status back to the note's frontmatter |
| `PostUpdate` | `modules/post-update.class.ts` | Edits an existing channel post using the URL stored in the note's frontmatter; writes update date to frontmatter |

Selected-text commands (`send-selected-text`, `send-rich-selected-text`) do **not** append a footer. All full-page sends (ribbon icons + full-page commands) do.

### Conversion pipelines

Markdown → Telegram-compatible format is handled by two pipelines in `src/helpers/`:

**`htmlConverter.ts`** (`convertToHTML`) — used by `SendToChat`, `PostCreate`, `PostUpdate`:
```
convertWikilinks → convertLineBreaks → escapeHtmlForTelegram → ...tokenizeMethods
```

**`mdConverter.ts`** (`convertToTgMd`) — used by `SendToChatRich`:
```
convertWikilinks → convertLineBreaks → insertDividers → escapeHtmlForTelegram
```
- `insertDividers`: replaces `\n{2,}` with `\n\n---\n\n` (section divider) and single `\n` with `\n\n` (paragraph break). Needed because Telegram Markdown collapses single newlines to spaces.
- Does **not** run `tokenizeMethods` (no Markdown→HTML tag conversion).

### Shared helpers (`src/helpers/`)

**`converters.ts`** — three shared transform functions used by both pipelines:
- `convertWikilinks`: resolves `[[wikilinks]]` → anchor using the note's `externalLinkField` frontmatter value; marks unpublished/missing targets with emoji warnings
- `convertLineBreaks`: joins soft-wrapped continuation lines with a space; preserves code blocks and block-level elements
- `escapeHtmlForTelegram`: escapes `&` and `<` only (leaves existing HTML entities intact)

**`tokenizers.ts`** — exports `tokenizeMethods`, an ordered array of regex transforms (HTML pipeline only) converting Markdown syntax to Telegram HTML tags: `<b>`, `<i>`, `<s>`, `<code>`, `<pre>`, `<blockquote>`, `<tg-spoiler>`, etc. Also handles Obsidian callouts → `<blockquote>` with emoji prefix.

**`escapers.ts`** — low-level string escape utilities used inside the pipeline.

**`footerBuilder.ts`** — `buildFooter(app, file, settings, format)` appended to full-page sends after conversion (so it bypasses the pipeline). Reads the current note's frontmatter and builds two sections:
- **"Більше [brand]:"** — links to other vault notes sharing the same `brand` frontmatter value that have a non-empty `externalLinkField`
- **"Пов'язані огляди:"** — links to notes listed in the current note's `related` frontmatter field (resolves wikilinks and plain note names)
- Appends `#огляди` hashtag at the end of the last section
- `format: "html"` (default) — links as `<a href="url">text</a>`, sections separated by `\n`
- `format: "md"` — links as `[text](url)`, prepends `\n---\n` divider before footer, sections separated by `\n\n`, `#огляди` appended inline to last section to avoid header interpretation

### Settings

`MyPluginSettings` (in `src/types.ts`) stores the bot token key name (secret looked up via `app.secretStorage`), chat/channel identifiers, and configurable frontmatter field names:

| Field | Purpose |
|---|---|
| `botToken` | Key name for secret storage lookup (not the token itself) |
| `chatId` | Private chat/group ID for `SendToChat` |
| `channelUsername` | Channel username or `-100...` ID for `PostCreate`/`PostUpdate` |
| `externalLinkField` | Frontmatter field holding the published Telegram post URL |
| `pubDateField` | Frontmatter field written with `YYYY-MM-DD` on first publish |
| `updateDateField` | Frontmatter field written with `YYYY-MM-DD` on update |
| `statusField` | Frontmatter field updated to `publishedStatusValue` on first publish |
| `publishedStatusValue` | Value written to `statusField` after publishing |

Settings UI lives in `src/settings/tab.class.ts`. The bot token is stored as a **secret key name** — the actual token is retrieved at send-time via `app.secretStorage.getSecret(settings.botToken)` (Obsidian 1.11+ secrets API).
