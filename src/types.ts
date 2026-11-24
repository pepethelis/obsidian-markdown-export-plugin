export interface Channel {
	/** Display name, e.g. "Main" or "Test". */
	name: string;
	/** `@username` or `-100…` numeric id. */
	username: string;
	/**
	 * Write the post link, publish date, status and format back to the note after
	 * posting. Turn off for test channels so they don't overwrite the real post link.
	 */
	updateNote: boolean;
}

export interface TelegramExportSettings {
	botToken: string;
	chatId: string;
	externalLinkField: string;
	pubDateField: string;
	updateDateField: string;
	statusField: string;
	publishedStatusValue: string;
	/** Channels for "Post to channel"; the first one is the default. */
	channels: Channel[];
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
	/** Index into settings.channels; only set by the "Post to channel" modal. */
	channelIndex?: number;
	includeHashtag: boolean;
	brandRelated: RelatedSection;
	tasteRelated: RelatedSection;
	authorRelated: RelatedSection;
	manualRelated: RelatedSection;
	typeRelated: RelatedSection;
}
