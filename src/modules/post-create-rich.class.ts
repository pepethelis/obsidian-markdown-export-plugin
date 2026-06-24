import { App, Notice, Modal, Setting, MarkdownView } from "obsidian";
import { convertToTgMd } from "../helpers/mdConverter";
import { buildFooter } from "../helpers/footerBuilder";
import MyPlugin from "../plugin.class";

class ReplyLinkModal extends Modal {
	result = "";
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: "Reply to a Post (Optional)" });

		new Setting(contentEl)
			.setName("Post Link")
			.setDesc(
				"Provide a Telegram post link to reply to, or leave empty to just send a new post.",
			)
			.addText((text) =>
				text.onChange((value) => {
					this.result = value;
				}),
			);

		new Setting(contentEl).addButton((btn) =>
			btn
				.setButtonText("Send")
				.setCta()
				.onClick(() => {
					this.close();
					this.onSubmit(this.result);
				}),
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export class PostCreateRich {
	private plugin: MyPlugin;

	constructor(plugin: MyPlugin) {
		this.plugin = plugin;

		plugin.addRibbonIcon(
			"share-2",
			"Send Telegram Post (Rich text)",
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

				page = page.replace(/^---\n([\s\S]*?)\n---\n?/, "").trim();

				if (!page) {
					new Notice("Please write something to send.");
					return;
				}

				const file = activeView.file;
				if (!file) return;

				const footer = buildFooter(plugin.app, file, plugin.settings, "md");
				const postLink = await this.exec(page, footer);

				if (!postLink) {
					new Notice(
						"Failed to send message, not saving link to frontmatter.",
					);
					return;
				}

				if (plugin.settings.externalLinkField) {
					await plugin.app.fileManager.processFrontMatter(
						file,
						(frontmatter) => {
							frontmatter[externalLinkField] = postLink;
						},
					);
					new Notice(`Link saved to ${externalLinkField} property.`);
				}

				if (plugin.settings.pubDateField) {
					// YYYY-MM-DD
					const pubDate = new Date().toISOString().split("T")[0];
					await plugin.app.fileManager.processFrontMatter(
						file,
						(frontmatter) => {
							frontmatter[plugin.settings.pubDateField] = pubDate;
						},
					);
				}

				if (
					plugin.settings.statusField &&
					plugin.settings.publishedStatusValue
				) {
					await plugin.app.fileManager.processFrontMatter(
						file,
						(frontmatter) => {
							frontmatter[plugin.settings.statusField] =
								plugin.settings.publishedStatusValue;
						},
					);
				}

				if (
					plugin.settings.statusField &&
					!plugin.settings.publishedStatusValue
				) {
					new Notice(
						"Status field is set but published status value is empty. Please set published status value in settings to update the status field.",
					);
				}
			},
		);
	}

	/**
	 * Sends a message to private chats.
	 * @param message - The message to send.
	 * @param settings - The plugin settings.
	 * @param app - The Obsidian application instance.
	 */
	async exec(message: string, footer = "") {
		const { channelUsername, externalLinkField } = this.plugin.settings;
		const app = this.plugin.app;

		const botToken = await app.secretStorage.getSecret(
			this.plugin.settings.botToken,
		);

		const converted =
			convertToTgMd({
				content: message,
				app,
				wikilinkExternalLinkField: externalLinkField,
				isRich: true,
			}) + footer;

		if (!botToken || !channelUsername) {
			new Notice(
				"Please set bot token and channel username in settings.",
			);
			return null;
		}

		// 1. open modal & 2. get link of post to reply to (optional)
		const replyLink = await new Promise<string>((resolve) => {
			new ReplyLinkModal(app, (result) => resolve(result)).open();
		});

		let replyToMessageId: number | undefined = undefined;

		if (replyLink && replyLink.trim()) {
			// extract message ID
			// Example: https://t.me/channel_name/123 or https://t.me/c/12345/123
			const match = replyLink.match(
				/https?:\/\/t\.me\/(?:c\/\d+\/|[^/]+\/)(\d+)/,
			);
			if (match) {
				replyToMessageId = parseInt(match[1], 10);
			} else {
				new Notice("Provided reply link was invalid, ignoring it.");
			}
		}

		// 3. send message
		const chatId =
			channelUsername.startsWith("@") ||
			channelUsername.startsWith("-100")
				? channelUsername
				: `@${channelUsername}`;

		const bodyPayload: Record<string, unknown> = {
			chat_id: chatId,
			rich_message: { markdown: converted },
		};

		if (replyToMessageId) {
			bodyPayload.reply_to_message_id = replyToMessageId;
		}

		const response = await fetch(
			`https://api.telegram.org/bot${botToken}/sendRichMessage`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(bodyPayload),
			},
		);

		if (response.ok) {
			const json = await response.json();
			new Notice("Message sent to Telegram ✅");

			let postUrl = "";
			if (channelUsername.startsWith("-100")) {
				const idPart = channelUsername.substring(4);
				postUrl = `https://t.me/c/${idPart}/${json.result.message_id}`;
			} else {
				const usernamePart = channelUsername.startsWith("@")
					? channelUsername.substring(1)
					: channelUsername;
				postUrl = `https://t.me/${usernamePart}/${json.result.message_id}`;
			}
			return postUrl;
		} else {
			const errorText = await response.text();
			console.error("Telegram API error:", errorText);
			new Notice("Failed to send message ❌");
			return null;
		}
	}
}
