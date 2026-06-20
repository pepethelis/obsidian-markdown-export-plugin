import { App } from "obsidian";
import { tokenizeMethods } from "./tokenizers";
import { convertWikilinks, convertLineBreaks, escapeHtmlForTelegram } from "./converters";

const pipline = [convertWikilinks, convertLineBreaks, escapeHtmlForTelegram, ...tokenizeMethods];

export const convertToHTML = (params: {
	content: string,
	wikilinkExternalLinkField: string,
	app: App,
	isRich?: boolean
}) => {
	const { content, wikilinkExternalLinkField, app, isRich = false } = params;
	const result = pipline.reduce(
		(text, method) => method({ input: text, app, wikilinkExternalLinkField, isRich }),
		content
	);

	return result;
};
