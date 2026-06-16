export interface MyPluginSettings {
	botToken: string;
	chatId: string;
	externalLinkField: string;
	pubDateField: string;
	updateDateField: string;
	statusField: string;
	publishedStatusValue: string;
	channelUsername: string;
}

export type PiplineMethodParams = (params: { input: string }) => string;
