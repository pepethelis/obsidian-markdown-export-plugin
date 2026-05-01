import { App } from "obsidian";
import { escapeHtmlPreserveEntities } from "./escapers";

export const convertWikilinks = (
	input: string,
	app: App,
	wikilinkExternalLinkField: string
): string => {
	const linkRegex = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;
	const result = input.replace(
		linkRegex,
		(_fullMatch, linkTargetRaw, displayOverrideRaw) => {
			const linkTarget = linkTargetRaw.trim();
			let displayText = escapeHtmlPreserveEntities(linkTarget);

			if (
				displayOverrideRaw !== undefined &&
				displayOverrideRaw.trim() !== ""
			) {
				displayText = escapeHtmlPreserveEntities(displayOverrideRaw.trim());
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

	console.log("With converted wikilinks:", {result});

	return result;
};
