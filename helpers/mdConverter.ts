import { App } from "obsidian";

// Helper function to escape MarkdownV2 special characters
export const covertToMarkdownV2 = (
	text: string,
	wikilinkExternalLinkField: string,
	app: App
) => {
	let content = text;
	const linkMap = new Map<string, string>();
	let linkCounter = 0;

	// Step 0: Convert wikilinks to Markdown links.
	const linkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
	content = content.replace(
		linkRegex,
		(_fullMatch, linkTargetRaw, displayOverrideRaw) => {
			const linkTarget = linkTargetRaw.trim();
			let displayText = linkTarget;

			if (
				displayOverrideRaw !== undefined &&
				displayOverrideRaw.trim() !== ""
			) {
				displayText = displayOverrideRaw.trim();
			}

			// Extract path and optional section (#heading or ^blockid)
			const [filePath] = linkTarget.split("#");
			const targetFile = app.metadataCache.getFirstLinkpathDest(
				filePath,
				"/"
			);

			if (!targetFile) {
				// If file doesn't exist
				return `${displayText}⚠️🔗`;
			}

			const fileCache = app.metadataCache.getFileCache(targetFile);
			const frontmatter = fileCache?.frontmatter;

			if (
				frontmatter &&
				typeof frontmatter[wikilinkExternalLinkField] === "string" &&
				frontmatter[wikilinkExternalLinkField].trim() !== ""
			) {
				const url = frontmatter[wikilinkExternalLinkField].trim();
				return `[${displayText}](${url})`;
			} else if (!frontmatter || frontmatter.status !== "Done") {
				// Not done or no frontmatter
				return `${displayText}⏳`;
			} else {
				return `${displayText}⚠️🔗`;
			}
		}
	);

	// Step 1: Tokenize links
	content = content.replace(
		/\[([\s\S]*?)\]\((.*?)\)/g,
		(match, linkText, url) => {
			const token = `__LINK_TOKEN_${linkCounter++}__`;
			const safeUrl = url
				.replace(/(?<!%)\(/g, "%28")
				.replace(/(?<!%)\)/g, "%29");
			linkMap.set(token, `[${linkText}](${safeUrl})`);
			return token;
		}
	);

	// Utility to escape all MarkdownV2 special characters for text content
	const escapeText = (str: string): string =>
		str.replace(/([_*\[\]()~`>#+\-=|{}.!\\<>])/g, "\\$&");

	// Step 2: Formatting conversions

	// Strikethrough
	content = content.replace(
		/(?<![a-zA-Z0-9~])~~(?!~)([\s\S]+?)(?<!~)~~(?![a-zA-Z0-9~])/g,
		(_, innerText) => `~${escapeText(innerText)}~`
	);

	// Bold Italic
	content = content.replace(
		/(?<![\w*_~])\*\*\*(?!\*)([^\n\r*]+?)(?<!\*)\*\*\*(?![\w*_~])|(?<![\w*_~])___(?!_)([^\n\r_]+?)(?<!_)___(?![\w*_~])/g,
		(match, g1, g2) => {
			const text = g1 || g2;
			return `*_${escapeText(text)}_ *`;
		}
	);

	// Italic
	content = content.replace(
		/(?<![\w*_~])\*(?!\*)([^\n\r*]+?)(?<!\*)\*(?![\w*_~])|(?<![\w*_~])_(?!_)([^\n\r_]+?)(?<!_)_(?![\w*_~])/g,
		(match, g1, g2) => `_${escapeText(g1 || g2)}_`
	);

	// Bold
	content = content.replace(
		/(?<![\w*_~])\*\*(?!\*)([^\n\r*]+?)(?<!\*)\*\*(?![\w*_~])|(?<![\w*_~])__(?!_)([^\n\r_]+?)(?<!_)__(?![\w*_~])/g,
		(match, g1, g2) => `*${escapeText(g1 || g2)}*`
	);

	// Final escape pass
	const finalEscape = (str: string): string =>
		str
			.replace(/(?<!\\)\./g, "\\.")
			.replace(/(?<!\\)\+/g, "\\+")
			.replace(/(?<!\\)\-/g, "\\-")
			.replace(/(?<!\\)\=/g, "\\=")
			.replace(/(?<!\\)\!/g, "\\!")
			.replace(/(?<!\\)\(/g, "\\(")
			.replace(/(?<!\\)\)/g, "\\)")
			.replace(/(?<!\\)[{}|#]/g, (match) => "\\" + match);

	content = finalEscape(content);

	// Step 3: Restore tokenized links with proper escaping
	for (const [token, original] of linkMap.entries()) {
		content = content.replace(token, () => {
			return original.replace(
				/\[([\s\S]*?)\]\((.*?)\)/,
				(_, linkText, url) => {
					return `[${escapeText(linkText)}](${url})`;
				}
			);
		});
	}

	

	return content;
};
