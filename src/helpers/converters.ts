import { escapeHtmlPreserveEntities } from "./escapers";
import { App } from "obsidian";

export const convertWikilinks = (params: {
	input: string;
	app: App;
	wikilinkExternalLinkField: string;
	isRich?: boolean;
}): string => {
	const { input, app, wikilinkExternalLinkField} = params;

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
				displayText = escapeHtmlPreserveEntities(
					displayOverrideRaw.trim(),
				);
			}

			// Extract path and optional section (#heading or ^blockid)
			const [filePath] = linkTarget.split("#");
			const targetFile = app.metadataCache.getFirstLinkpathDest(
				filePath,
				"/",
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
		},
	);

	console.log("With converted wikilinks:", { result });

	return result;
};

export const convertLineBreaks = (params: {
	input: string;
}): string => {
	const { input } = params;
	
	let inCodeBlock = false;
	const lines = input.replace(/\r/g, '').split('\n');
	const result: string[] = [];
	let emptyLinesCount = 0;
	const blockRegex = /^(#{1,6}\s|>\s?|[-*+]\s|\d+\.\s|\||---|===|\*\*\*|```|\$\$)/;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		
		if (line.trim().startsWith('```')) {
			inCodeBlock = !inCodeBlock;
			if (emptyLinesCount > 0) {
				for (let j = 0; j < emptyLinesCount - 1; j++) {
					result.push('');
				}
				emptyLinesCount = 0;
			}
			result.push(line);
			continue;
		}
		
		if (inCodeBlock) {
			result.push(line);
			continue;
		}
		
		if (line.trim() === '') {
			emptyLinesCount++;
			continue;
		}
		
		const isBlockStart = blockRegex.test(line.trimStart());
		
		if (result.length > 0) {
			const prevLine = result[result.length - 1];
			const isPrevBlockStart = prevLine.trim() !== '' && blockRegex.test(prevLine.trimStart());
			const isHardBreak = prevLine.endsWith('  ');
			
			if (!isBlockStart && !isPrevBlockStart && !isHardBreak && emptyLinesCount === 0) {
				result[result.length - 1] = prevLine + ' ' + line.trimStart();
			} else {
				for (let j = 0; j < emptyLinesCount - 1; j++) {
					result.push('');
				}
				result.push(line);
			}
		} else {
			result.push(line);
		}
		
		emptyLinesCount = 0;
	}
	
	return result.join('\n');
};

export const escapeHtmlForTelegram = (params: { input: string }): string => {
	return params.input
		.replace(/&(?![a-zA-Z]+;|#\d+;|#x[0-9A-Fa-f]+;)/g, "&amp;")
		.replace(/</g, "&lt;");
};
