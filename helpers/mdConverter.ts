import { App } from "obsidian";

const convertWikilinks = (
	input: string,
	app: App,
	wikilinkExternalLinkField: string
): string => {
	const linkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
	const result = input.replace(
		linkRegex,
		(_fullMatch, linkTargetRaw, displayOverrideRaw) => {
			const linkTarget = linkTargetRaw.trim();
			let displayText = linkTarget
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");

			if (
				displayOverrideRaw !== undefined &&
				displayOverrideRaw.trim() !== ""
			) {
				displayText = displayOverrideRaw
					.trim()
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;");
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
			} else if (!frontmatter || frontmatter.status !== "Published") {
				// Not published or no frontmatter
				return `${displayText}⏳`;
			} else {
				return `${displayText}⚠️🔗`;
			}
		}
	);

	return result;
};

const tokenizeBold = (input: string): string => {
	return input.replace(/(\*\*|__)(?=\S)(.+?[*_]*)(?<=\S)\1/g, "<b>$2</b>");
};

const tokenizeStrikethrough = (input: string): string => {
	return input.replace(/~~(?=\S)([^\n]*?\S)~~/g, "<s>$1</s>");
};

const tokenizeItalics = (input: string): string => {
	return input.replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, "<i>$2</i>");
};

const tokenizeUnderline = (input: string): string => {
	return input;
};

const tokenizeLinks = (input: string): string => {
	return input.replace(
		/\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]+)")?\)/g,
		(_, text, url, title) => {
			if (!/^https?:\/\/[^\s)]+$/i.test(url)) return text;

			const safeText = text
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;");
			const safeUrl = url.replace(/"/g, "&quot;");
			const safeTitle = title
				? ` title="${title.replace(/"/g, "&quot;")}"`
				: "";

			return `<a href="${safeUrl}"${safeTitle}>${safeText}</a>`;
		}
	);
};

const tokenizeMethods = [
	convertWikilinks,
	tokenizeLinks,
	tokenizeBold,
	tokenizeStrikethrough,
	tokenizeItalics,
	tokenizeUnderline,
];

const escapeMarkdownV2 = (text: string): string =>
	text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");

const detokenizeBold = (input: string): string =>
	input.replace(/<b>(.*?)<\/b>/g, (_, inner) => `*${inner}*`);

const detokenizeItalics = (input: string): string =>
	input.replace(/<i>(.*?)<\/i>/g, (_, inner) => `_${inner}_`);

const detokenizeStrikethrough = (input: string): string =>
	input.replace(/<s>(.*?)<\/s>/g, (_, inner) => `~${inner}~`);

const detokenizeUnderline = (input: string): string =>
	input.replace(/<u>(.*?)<\/u>/g, (_, inner) => `__${inner}__`);

const detokenizeLinks = (input: string): string =>
	input.replace(
		/<a href="(https?:\/\/[^"]+)"(?: title="([^"]*)")?>(.*?)<\/a>/g,
		(_, url, title, text) => {
			// Escape only parentheses in URL
			const safeUrl = url.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
			return `[${text}](${safeUrl})`;
		}
	);

const parenthesesEscape = (input: string): string => {
	return input.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
};

const plusEscape = (input: string): string => {
	return input.replace(/(?<!\\)\+/g, "\\+");
}

const detokenizeMethods = [
	parenthesesEscape,
	detokenizeLinks,
	detokenizeItalics,
	detokenizeBold,
	detokenizeStrikethrough,
	detokenizeUnderline,
	plusEscape
];

export const convertToMarkdownV2 = (
	content: string,
	wikilinkExternalLinkField: string,
	app: App
) => {
	const tokenizedContent = tokenizeMethods.reduce(
		(text, method) => method(text, app, wikilinkExternalLinkField),
		content
	);

	const result = detokenizeMethods.reduce(
		(text, method) => method(text),
		tokenizedContent
	);

	console.log("Converted MarkdownV2:", {tokenizedContent, result});

	return result;
};
