import { MarkdownView, Notice, Editor } from "obsidian";
import { convertToHTML } from "src/helpers/htmlConverter";
import MyPlugin from "../plugin.class";

export class SendToChat {
	private plugin: MyPlugin;

	constructor(plugin: MyPlugin) {
		this.plugin = plugin;
		
		plugin
			.addRibbonIcon("dice", "Send to Telegram Chat", async () => {
				const { chatId } = plugin.settings;
				if (!chatId) {
					new Notice("Please set the chat ID in the settings.");
					return;
				}

				const activeView =
					plugin.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) return;

				const editor = activeView.editor;
				let page = editor.getValue();
				page = page.replace(/^---\n([\s\S]*?)\n---\n?/, "").trim();

				if (!page) {
					new Notice("Please write something to send.");
					return;
				}

				if (page) {
					await this.exec(page);
				}
			})
			.addClass("my-plugin-ribbon-class");

		plugin.addCommand({
			id: "send-selected-text",
			name: "Send selected text to Telegram",
			editorCallback: async (editor: Editor) => {
				const selectedText = editor.getSelection();
				if (!selectedText) {
					new Notice("Please select some text to send.");
					return;
				}

				await this.exec(selectedText);
			},
		});

		plugin.addCommand({
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
					await this.exec(page);
				}
			},
		});
	}

	/**
	 * Sends a message to private chats.
	 * @param message - The message to send.
	 * @param settings - The plugin settings.
	 * @param app - The Obsidian application instance.
	 */
	async exec(message: string) {
		const { chatId, externalLinkField } = this.plugin.settings;
		const app = this.plugin.app;

		const botToken = await app.secretStorage.getSecret(this.plugin.settings.botToken);

		const converted = convertToHTML(message, externalLinkField, app);

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
}
