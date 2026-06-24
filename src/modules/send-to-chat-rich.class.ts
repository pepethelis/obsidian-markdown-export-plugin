import { MarkdownView, Notice, Editor } from "obsidian";
import { convertToTgMd } from "../helpers/mdConverter";
import { buildFooter } from "../helpers/footerBuilder";
import MyPlugin from "../plugin.class";

export class SendToChatRich {
	private plugin: MyPlugin;

	constructor(plugin: MyPlugin) {
		this.plugin = plugin;

		plugin
			.addRibbonIcon(
				"bot",
				"Send to Telegram Chat (Use rich text)",
				async () => {
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

					const footer = activeView.file
						? buildFooter(plugin.app, activeView.file, plugin.settings, "md")
						: "";

					if (page) {
						await this.exec(page, footer);
					}
				},
			)
			.addClass("my-plugin-ribbon-class");

		plugin.addCommand({
			id: "send-rich-selected-text",
			name: "Send selected text to Telegram (Use rich text)",
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
			id: "send-rich-page-without-properties",
			name: "Send page to Telegram (Use rich text)",
			editorCallback: async (editor: Editor) => {
				let page = editor.getValue();
				page = page.replace(/^---\n([\s\S]*?)\n---\n?/, "").trim();

				if (!page) {
					new Notice("Please write something to send.");
					return;
				}

				const file =
					plugin.app.workspace.getActiveViewOfType(MarkdownView)?.file;
				const footer = file
					? buildFooter(plugin.app, file, plugin.settings, "md")
					: "";

				if (page) {
					await this.exec(page, footer);
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
	async exec(message: string, footer = "") {
		const { chatId, externalLinkField } = this.plugin.settings;
		const app = this.plugin.app;

		const botToken = await app.secretStorage.getSecret(
			this.plugin.settings.botToken,
		);

		const converted =
			convertToTgMd({
				content: message,
				wikilinkExternalLinkField: externalLinkField,
				app,
				isRich: true,
			}) + footer;

		if (!botToken || !chatId) {
			new Notice("Please set bot token and chat ID in settings.");
			return;
		}

		const response = await fetch(
			`https://api.telegram.org/bot${botToken}/sendRichMessage`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chat_id: chatId,
					rich_message: {
						markdown: converted,
					},
					parse_mode: "HTML",
					disable_web_page_preview: true,
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
