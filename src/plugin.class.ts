import { Plugin } from "obsidian";
import { Channel, TelegramExportSettings } from "./types";
import { MdExportSettingTab } from "./settings/tab.class";
import { DEFAULT_SETTINGS } from "./settings/default";
import { Export } from "./modules/export.class";

export default class TelegramExportPlugin extends Plugin {
	settings!: TelegramExportSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MdExportSettingTab(this.app, this));

		new Export(this);
	}

	async loadSettings() {
		const data = (await this.loadData()) ?? {};
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data, {
			channels: Array.isArray(data.channels)
				? data.channels.map((c: Partial<Channel>) => ({ updateNote: true, ...c }))
				: [],
		});

		// Migrate the single `channelUsername` setting (≤ 0.12) into the channel list.
		if (typeof data.channelUsername === "string") {
			if (data.channelUsername && this.settings.channels.length === 0) {
				this.settings.channels.push({ name: "Main", username: data.channelUsername, updateNote: true });
			}
			delete (this.settings as unknown as Record<string, unknown>).channelUsername;
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
