import { Plugin } from "obsidian";
import { TelegramExportSettings } from "./types";
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
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData(),
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
