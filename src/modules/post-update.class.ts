import { Notice, MarkdownView } from "obsidian";
import { convertToHTML } from "../helpers/htmlConverter";
import MyPlugin from "../plugin.class";

export class PostUpdate {
	private plugin: MyPlugin;

	constructor(plugin: MyPlugin) {
		this.plugin = plugin;

		plugin.addRibbonIcon(
			"refresh-ccw-dot",
			"Update Telegram Post",
			async () => {
				const { botToken, externalLinkField } = plugin.settings;
				if (!botToken) {
					new Notice("Please set the bot token in the settings.");
					return;
				}

				const activeView =
					plugin.app.workspace.getActiveViewOfType(MarkdownView);
				if (!activeView) return;

				const editor = activeView.editor;
				let page = editor.getValue();

				const file = activeView.file;
				if (!file) return;

				const fileCache = plugin.app.metadataCache.getFileCache(file);
				const tgPostLink = fileCache?.frontmatter?.[externalLinkField];

				page = page.replace(/^---\n([\s\S]*?)\n---\n?/, "").trim();

				if (!page) {
					new Notice("Please write something to send.");
					return;
				}

				if (!tgPostLink) {
					new Notice("Please add an external link to the page.");
					return;
				}

				const result = await this.exec(tgPostLink, page);

				if (result) {
					if (plugin.settings.updateDateField) {
						// YYYY-MM-DD
						const pubDate = new Date().toISOString().split("T")[0];
						await plugin.app.fileManager.processFrontMatter(
							file,
							(frontmatter) => {
								frontmatter[plugin.settings.updateDateField] =
									pubDate;
							},
						);
					}
				}
			},
		);
	}

	/**
	 * Sends a message to private chats.
	 * @param postLink - The link to the Telegram post.
	 * @param message - The message to send.
	 * @param settings - The plugin settings.
	 * @param app - The Obsidian application instance.
	 */
	async exec(postLink: string, message: string) {
		const { externalLinkField } = this.plugin.settings;
		const app = this.plugin.app;

		const botToken = await app.secretStorage.getSecret(
			this.plugin.settings.botToken,
		);

		const converted = convertToHTML({
			content: message,
			app,
			wikilinkExternalLinkField: externalLinkField,
			isRich: false,
		});

		if (!botToken) {
			new Notice("Please set bot token in settings.");
			return;
		}

		// Parse the post link to extract chat username/ID and message ID
		// Expected formats:
		// Public: https://t.me/channel_name/123
		// Private: https://t.me/c/123456789/123
		let chatId: string | number;
		let messageId: number;

		if (postLink.includes("/c/")) {
			const linkMatch = postLink.match(
				/https?:\/\/t\.me\/c\/(\d+)\/(\d+)/,
			);
			if (!linkMatch) {
				new Notice("Invalid private Telegram post link ❌");
				return;
			}
			// Private channel IDs in Telegram API are prefixed with -100
			chatId = `-100${linkMatch[1]}`;
			messageId = parseInt(linkMatch[2], 10);
		} else {
			const linkMatch = postLink.match(
				/https?:\/\/t\.me\/([^/]+)\/(\d+)/,
			);
			if (!linkMatch) {
				new Notice("Invalid public Telegram post link ❌");
				return;
			}
			chatId = `@${linkMatch[1]}`;
			messageId = parseInt(linkMatch[2], 10);
		}

		const response = await fetch(
			`https://api.telegram.org/bot${botToken}/editMessageText`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chat_id: chatId,
					message_id: messageId,
					text: converted,
					parse_mode: "HTML",
					disable_web_page_preview: true,
				}),
			},
		);

		if (response.ok) {
			new Notice("Post updated ✅");
			return true;
		} else {
			const errorText = await response.text();
			console.error("Telegram API error:", errorText);
			new Notice("Failed to update post ❌");
			return false;
		}
	}
}
