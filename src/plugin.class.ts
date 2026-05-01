import { Plugin } from "obsidian";
import { MyPluginSettings } from "./types";
import { MdExportSettingTab } from "./settings/tab.class";
import { DEFAULT_SETTINGS } from "./settings/default";
import { SendToChat } from "./modules/send-to-chat.class";
import { PostCreate } from "./modules/post-create.class";
import { PostUpdate } from "./modules/post-update.class";

export default class MyPlugin extends Plugin {
	settings!: MyPluginSettings;
	isElementsAdded = false;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MdExportSettingTab(this.app, this));

		new SendToChat(this);
		new PostCreate(this);
		new PostUpdate(this);

		this.isElementsAdded = true;
	}

	async onunload() {
		console.log("Plugin unloaded");
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
