import { App } from "obsidian";
import { convertWikilinks } from "./converters";


const covertHashTags = (params: { input: string }): string => {
	const { input } = params;
	// convert #hashtags to \#hashtags 
	return input.replace(/(?<!\S)#[\p{L}\p{N}_/-]+/gu, "\\$&");
}



export const convertToTgMd = (params: {
	content: string,
	wikilinkExternalLinkField: string,
	app: App,
	isRich?: boolean
}) => {
	const { content, wikilinkExternalLinkField, app, isRich = false } = params;
	const result = [convertWikilinks, covertHashTags].reduce(
		(text, method) => method({ input: text, app, wikilinkExternalLinkField, isRich }),
		content
	);

	return result;
};
