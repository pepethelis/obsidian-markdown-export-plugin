import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import TelegramExportPlugin from "../plugin.class";
import { TelegramExportSettings } from "../types";

type SettingKey = keyof TelegramExportSettings;

export class MdExportSettingTab extends PluginSettingTab {
	plugin: TelegramExportPlugin;

	constructor(app: App, plugin: TelegramExportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.icon = "message-square-share";
	}

	getSettingDefinitions(): SettingDefinitionItem<SettingKey>[] {
		return [
			{
				type: "group",
				heading: "Telegram",
				items: [
					{
						name: "Telegram Bot Token",
						desc: "Your bot token from BotFather",
						aliases: ["token", "bot"],
						control: { type: "secret", key: "botToken" },
					},
					{
						name: "Telegram Chat ID",
						desc: "Chat or group ID to send messages to",
						control: {
							type: "text",
							key: "chatId",
							placeholder: "e.g. 123456789",
							validate: (value) =>
								value === "" || /^-?\d+$/.test(value.trim())
									? undefined
									: "Chat ID must be a number",
						},
					},
					{
						name: "Channel Username",
						desc: "Channel username to send messages to",
						control: {
							type: "text",
							key: "channelUsername",
							placeholder: "e.g. '@channel_name' or '-100123456789'",
							validate: (value) =>
								value === "" || /^(@\w{5,}|-100\d+)$/.test(value.trim())
									? undefined
									: "Use '@channel_name' or a numeric ID starting with -100",
						},
					},
				],
			},
			{
				type: "group",
				heading: "Frontmatter fields",
				items: [
					{
						name: "Publication Date Field",
						desc: "Field name for publication date in the note. Leave empty if not used.",
						control: { type: "text", key: "pubDateField", placeholder: "e.g. 'pubDate' or 'date'" },
					},
					{
						name: "Last Updated Date Field",
						desc: "Field name for last updated date in the note. Leave empty if not used.",
						control: {
							type: "text",
							key: "updateDateField",
							placeholder: "e.g. 'updatedAt' or 'lastModified'",
						},
					},
					{
						name: "Status Field",
						desc: "Field name for status in the note. Leave empty if not used.",
						control: { type: "text", key: "statusField", placeholder: "e.g. 'status'" },
					},
					{
						name: "Published Status Value",
						desc: "The value indicating a note is published.",
						control: {
							type: "text",
							key: "publishedStatusValue",
							placeholder: "e.g. 'published'",
						},
					},
					{
						name: "External Link Field",
						desc: "Field name for external link in the note. Leave empty if not used.",
						control: {
							type: "text",
							key: "externalLinkField",
							placeholder: "e.g. 'post' or 'externalLink'",
						},
					},
				],
			},
			{
				type: "group",
				heading: "Export",
				items: [
					{
						name: "Final Hashtag",
						desc: "The hashtag to include in the exported content",
						control: { type: "text", key: "finalHashtag", placeholder: "e.g. '#огляди'" },
					},
				],
			},
		];
	}
}
