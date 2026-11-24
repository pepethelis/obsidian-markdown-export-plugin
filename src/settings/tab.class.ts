import { App, PluginSettingTab, SettingDefinitionItem, SettingDefinitionList } from "obsidian";
import { editChannel } from "../modals/channel.modal";
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

	/**
	 * Channels for "Post to channel". The first one is the default in the export
	 * modal; drag to reorder. Structural changes are persisted and then the tab
	 * is rebuilt with `update()`.
	 */
	private channelList(): SettingDefinitionList<SettingKey> {
		const { settings } = this.plugin;
		const commit = async () => {
			await this.plugin.saveSettings();
			this.update();
		};

		return {
			type: "list",
			heading: "Channels",
			emptyState: "No channels yet. Add one to use “Post to channel”.",
			addItem: {
				name: "Add channel",
				action: async () => {
					const channel = await editChannel(this.app, null);
					if (!channel) return;
					settings.channels.push(channel);
					await commit();
				},
			},
			onDelete: async (index) => {
				settings.channels.splice(index, 1);
				await commit();
			},
			onReorder: async (oldIndex, newIndex) => {
				const [moved] = settings.channels.splice(oldIndex, 1);
				if (moved) settings.channels.splice(newIndex, 0, moved);
				await commit();
			},
			items: settings.channels.map((channel, index) => ({
				name: channel.name,
				desc: [
					channel.username,
					index === 0 ? "default" : "",
					channel.updateNote ? "" : "doesn't update note",
				]
					.filter(Boolean)
					.join(" · "),
				aliases: ["channel"],
				action: async () => {
					const updated = await editChannel(this.app, channel);
					if (!updated) return;
					settings.channels[index] = updated;
					await commit();
				},
			})),
		};
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
				],
			},
			this.channelList(),
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
