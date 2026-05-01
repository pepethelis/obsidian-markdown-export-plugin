import { App, PluginSettingTab, Setting, SecretComponent, requireApiVersion } from "obsidian";
import MyPlugin from "../plugin.class";

export class MdExportSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		if (typeof requireApiVersion === 'function' && requireApiVersion('1.11.0')) {
			this.icon = 'message-square-share';
		}
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Telegram Bot Token")
			.setDesc("Your bot token from BotFather")
			.addComponent((el) =>
				new SecretComponent(this.app, el)
					.setValue(this.plugin.settings.botToken)
					.onChange((value) => {
						this.plugin.settings.botToken = value;
						this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Telegram Chat ID")
			.setDesc("Chat or group ID to send messages to")
			.addText((text) =>
				text
					.setPlaceholder("e.g. 123456789")
					.setValue(this.plugin.settings.chatId)
					.onChange(async (value) => {
						this.plugin.settings.chatId = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Publication Date Field")
			.setDesc("Field name for publication date in the note. Leave empty if not used.")
			.addText((text) =>
				text
					.setPlaceholder("e.g. 'pubDate' or 'date'")
					.setValue(this.plugin.settings.pubDateField)
					.onChange(async (value) => {
						this.plugin.settings.pubDateField = value;
						await this.plugin.saveSettings();
					}),
			);
		
		new Setting(containerEl)
			.setName("Last Updated Date Field")
			.setDesc("Field name for last updated date in the note. Leave empty if not used.")
			.addText((text) =>
				text
					.setPlaceholder("e.g. 'updatedAt' or 'lastModified'")
					.setValue(this.plugin.settings.updateDateField)
					.onChange(async (value) => {
						this.plugin.settings.updateDateField = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Status Field")
			.setDesc("Field name for status in the note. Leave empty if not used.")
			.addText((text) =>
				text
					.setPlaceholder("e.g. 'status'")

					.setValue(this.plugin.settings.statusField)
					.onChange(async (value) => {
						this.plugin.settings.statusField = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Published Status Value")
			.setDesc("The value indicating a note is published.")
			.addText((text) =>
				text
					.setPlaceholder("e.g. 'published'")

					.setValue(this.plugin.settings.publishedStatusValue)
					.onChange(async (value) => {
						this.plugin.settings.publishedStatusValue = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("External Link Field")
			.setDesc("Field name for external link in the note. Leave empty if not used.")
			.addText((text) =>
				text
					.setPlaceholder("e.g. 'post' or 'externalLink'")
					.setValue(this.plugin.settings.externalLinkField)
					.onChange(async (value) => {
						this.plugin.settings.externalLinkField = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Channel Username")
			.setDesc("Channel username to send messages to")
			.addText((text) =>
				text
					.setPlaceholder("e.g. '@channel_name' or '-100123456789'")
					.setValue(this.plugin.settings.channelUsername)
					.onChange(async (value) => {
						this.plugin.settings.channelUsername = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
