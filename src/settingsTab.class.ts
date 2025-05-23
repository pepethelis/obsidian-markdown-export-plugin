import { App, PluginSettingTab, Setting } from "obsidian";
import MyPlugin from "./plugin.class";

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Telegram Bot Token")
			.setDesc("Your bot token from BotFather")
			.addText((text) =>
				text
					.setPlaceholder("123456:ABC...")
					.setValue(this.plugin.settings.botToken)
					.onChange(async (value) => {
						this.plugin.settings.botToken = value;
						await this.plugin.saveSettings();
					})
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
					})
			);

		new Setting(containerEl)
			.setName("External Link Field")
			.setDesc("Field name for external link in the note")
			.addText((text) =>
				text
					.setPlaceholder("e.g. https://t.me/kallection/25972")
					.setValue(this.plugin.settings.externalLinkField)
					.onChange(async (value) => {
						this.plugin.settings.externalLinkField = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
