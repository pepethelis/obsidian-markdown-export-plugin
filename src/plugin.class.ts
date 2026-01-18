import { Editor, MarkdownView, Notice, Plugin } from "obsidian";
import { MyPluginSettings } from "./types";
import { MdExportSettingTab } from "./settingsTab.class";
import { DEFAULT_SETTINGS } from "./defaultSettings";
import { convertToHTML } from "helpers/htmlConverter";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	isElementsAdded = false;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new MdExportSettingTab(this.app, this));
		this.addElements();
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

	async sendToTelegram(message: string) {
		const { chatId, externalLinkField } = this.settings;

		const botToken = this.app.secretStorage.getSecret(
			this.settings.botToken,
		);

		const converted = convertToHTML(message, externalLinkField, this.app);

		if (!botToken || !chatId) {
			new Notice("Please set bot token and chat ID in settings.");
			return;
		}

		const response = await fetch(
			`https://api.telegram.org/bot${botToken}/sendMessage`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chat_id: chatId,
					text: converted,
					parse_mode: "HTML",
				}),
			},
		);

		if (response.ok) {
			new Notice("Message sent to Telegram ✅");
		} else {
			const errorText = await response.text();
			console.error("Telegram API error:", errorText);
			new Notice("Failed to send message ❌");
		}
	}

	async addElements() {
		if (this.isElementsAdded) return;

		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Send to Telegram",
			async () => {
				const { chatId } = this.settings;
				if (!chatId) {
					new Notice("Please set the chat ID in the settings.");
					return;
				}

				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) return;

				const editor = activeView.editor;
				let page = editor.getValue();
				page = page.replace(/^---\n([\s\S]*?)\n---\n?/, "").trim();

				if (!page) {
					new Notice("Please write something to send.");
					return;
				}

				if (page) {
					await this.sendToTelegram(page);
				}
			},
		);

		ribbonIconEl.addClass("my-plugin-ribbon-class");

		this.addCommand({
			id: "send-selected-text",
			name: "Send selected text to Telegram",
			editorCallback: async (editor: Editor) => {
				const selectedText = editor.getSelection();
				if (!selectedText) {
					new Notice("Please select some text to send.");
					return;
				}

				await this.sendToTelegram(selectedText);
			},
		});

		this.addCommand({
			id: "send-page-without-properties",
			name: "Send page to Telegram",
			editorCallback: async (editor: Editor) => {
				let page = editor.getValue();
				page = page.replace(/^---\n([\s\S]*?)\n---\n?/, "").trim();

				if (!page) {
					new Notice("Please write something to send.");
					return;
				}

				if (page) {
					await this.sendToTelegram(page);
				}
			},
		});

		this.isElementsAdded = true;
	}
}
