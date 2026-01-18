import { App, PluginSettingTab, Setting, SecretComponent, requireApiVersion } from "obsidian";
import MyPlugin from "./plugin.class";

export interface MyPluginSettings {
	botToken: string;
	chatId: string;
	externalLinkField: string;
}

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
			.setName("External Link Field")
			.setDesc("Field name for external link in the note")
			.addText((text) =>
				text
					.setPlaceholder("e.g. 'post' or 'externalLink'")
					.setValue(this.plugin.settings.externalLinkField)
					.onChange(async (value) => {
						this.plugin.settings.externalLinkField = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
