import { App } from "obsidian";
import { tokenizeMethods } from "./tokenizers";
import { convertWikilinks } from "./converters";

const pipline = [convertWikilinks, ...tokenizeMethods];

export const convertToHTML = (
	content: string,
	wikilinkExternalLinkField: string,
	app: App
) => {
	const result = pipline.reduce(
		(text, method) => method(text, app, wikilinkExternalLinkField),
		content
	);

	return result;
};
