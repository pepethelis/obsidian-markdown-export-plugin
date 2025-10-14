import { App } from "obsidian";
import { tokenizeMethods } from "./tokenizers";
import { detokenizeMethods } from "./detokenizers";
import { convertWikilinks } from "./converters";
import { minusEscape, parenthesesEscape, plusEscape } from "./escapers";

const pipline = [
	convertWikilinks,
	...tokenizeMethods,
	parenthesesEscape, // Escape parentheses before detokenizing links
	...detokenizeMethods,
	plusEscape,
	minusEscape
];

export const convertToMarkdownV2 = (
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
