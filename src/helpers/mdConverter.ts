import { App } from "obsidian";
import { convertWikilinks, convertLineBreaks, escapeHtmlForTelegram } from "./converters";


const covertHashTags = (params: { input: string }): string => {
	const { input } = params;
	// convert #hashtags to \#hashtags
	return input.replace(/(?<!\S)#[\p{L}\p{N}_/-]+/gu, "\\$&");
}

// Telegram Markdown collapses single \n to a space; replace all paragraph breaks
// with a divider line so they survive rendering.
const insertDividers = (params: { input: string }): string => {
	return params.input
		.replace(/\n{2,}/g, "\n\n---\n\n")           // 2+ \n → divider
		.replace(/(?<!\n)\n(?!\n)/g, "\n\n");          // single \n → paragraph break
};

export const convertToTgMd = (params: {
	content: string,
	wikilinkExternalLinkField: string,
	app: App,
	isRich?: boolean
}) => {
	const { content, wikilinkExternalLinkField, app, isRich = false } = params;
	const result = [convertWikilinks, convertLineBreaks, insertDividers, escapeHtmlForTelegram].reduce(
		(text, method) => method({ input: text, app, wikilinkExternalLinkField, isRich }),
		content
	);

	return result;
};
