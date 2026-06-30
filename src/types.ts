export interface MyPluginSettings {
	botToken: string;
	chatId: string;
	externalLinkField: string;
	pubDateField: string;
	updateDateField: string;
	statusField: string;
	publishedStatusValue: string;
	channelUsername: string;
	finalHashtag: string;
}

export type PiplineMethodParams = (params: { input: string }) => string;

export interface RelatedItem {
	url: string;
	name: string;
	enabled: boolean;
}

export interface RelatedSection {
	enabled: boolean;
	items: RelatedItem[];
}

export interface ExportOptions {
	format: "html" | "md";
	includeHashtag: boolean;
	brandRelated: RelatedSection;
	tasteRelated: RelatedSection;
	manualRelated: RelatedSection;
	replyLink: string;
}
