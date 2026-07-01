import { MarkdownView, Notice, TFile } from "obsidian";
import { buildFooterFromItems } from "../helpers/footerBuilder";
import { resolveStoredFormat } from "../helpers/telegramFormat";
import { buildTelegramRequest, TelegramRequest } from "../helpers/telegramRequest";
import {
	computeBrandRelated,
	computeTasteRelated,
	computeManualRelated,
	scanOtherMarkdownFiles,
} from "../helpers/relatedBuilder";
import {
	ExportSettingsModal,
	ModalParams,
} from "../modals/export-settings.modal";
import { ExportOptions } from "../types";
import MyPlugin from "../plugin.class";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

export class Export {
	private plugin: MyPlugin;

	constructor(plugin: MyPlugin) {
		this.plugin = plugin;

		plugin
			.addRibbonIcon("send", "Export full page", () => this.runFullPage())
			.addClass("my-plugin-ribbon-class");

		plugin
			.addRibbonIcon("scissors", "Export selection", () =>
				this.runSelection(),
			)
			.addClass("my-plugin-ribbon-class");

		plugin
			.addRibbonIcon("arrow-up-right", "Post to channel", () =>
				this.runChannel(),
			)
			.addClass("my-plugin-ribbon-class");

		plugin
			.addRibbonIcon("pencil-line", "Update post", () => this.runUpdate())
			.addClass("my-plugin-ribbon-class");

		plugin.addCommand({
			id: "export-full-page",
			name: "Export full page",
			editorCallback: () => this.runFullPage(),
		});

		plugin.addCommand({
			id: "export-selection",
			name: "Export selection",
			editorCallback: () => this.runSelection(),
		});

		plugin.addCommand({
			id: "post-to-channel",
			name: "Post to channel",
			editorCallback: () => this.runChannel(),
		});

		plugin.addCommand({
			id: "update-post",
			name: "Update post",
			editorCallback: () => this.runUpdate(),
		});
	}

	// ── helpers ────────────────────────────────────────────────────────────

	private computeRelated(file: TFile | null) {
		const { app, settings } = this.plugin;
		if (!file) return { brandLabel: "", brandItems: [], tasteItems: [], manualItems: [] };
		const candidates = scanOtherMarkdownFiles(app, file);
		const { label: brandLabel, items: brandItems } = computeBrandRelated(app, file, settings, candidates);
		const tasteItems = computeTasteRelated(app, file, settings, candidates);
		const manualItems = computeManualRelated(app, file, settings);
		return { brandLabel, brandItems, tasteItems, manualItems };
	}

	private openModal(params: ModalParams): Promise<ExportOptions | null> {
		return new Promise((resolve) => {
			new ExportSettingsModal(this.plugin.app, params, resolve).open();
		});
	}

	// ── commands ───────────────────────────────────────────────────────────

	private async runFullPage() {
		const activeView =
			this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		let page = activeView.editor.getValue();
		page = page.replace(FRONTMATTER_RE, "").trim();
		if (!page) { new Notice("Please write something to send."); return; }

		const { settings } = this.plugin;
		const botToken = await this.plugin.app.secretStorage.getSecret(settings.botToken);
		if (!botToken || !settings.chatId) {
			new Notice("Please set bot token and chat ID in settings.");
			return;
		}

		const { brandLabel, brandItems, tasteItems, manualItems } =
			this.computeRelated(activeView.file);

		const options = await this.openModal({
			title: "Export page",
			submitLabel: "Export",
			showReplyLink: false,
			finalHashtag: settings.finalHashtag,
			brandLabel, brandItems, tasteItems, manualItems,
		});
		if (!options) return;

		const footer = buildFooterFromItems(options, brandLabel, settings);
		await this.exec(page, footer, options.format, botToken);
	}

	private async runSelection() {
		const activeView =
			this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const selectedText = activeView.editor.getSelection();
		if (!selectedText) { new Notice("Please select some text to send."); return; }

		const { settings } = this.plugin;
		const botToken = await this.plugin.app.secretStorage.getSecret(settings.botToken);
		if (!botToken || !settings.chatId) {
			new Notice("Please set bot token and chat ID in settings.");
			return;
		}

		const { brandLabel, brandItems, tasteItems, manualItems } =
			this.computeRelated(activeView.file);

		const options = await this.openModal({
			title: "Export selection",
			submitLabel: "Export",
			showReplyLink: false,
			finalHashtag: settings.finalHashtag,
			brandLabel, brandItems, tasteItems, manualItems,
		});
		if (!options) return;

		const footer = buildFooterFromItems(options, brandLabel, settings);
		await this.exec(selectedText, footer, options.format, botToken);
	}

	private async runChannel() {
		const activeView =
			this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		let page = activeView.editor.getValue();
		page = page.replace(FRONTMATTER_RE, "").trim();
		if (!page) { new Notice("Please write something to send."); return; }

		const { app, settings } = this.plugin;
		const file = activeView.file;
		if (!file) return;

		const botToken = await app.secretStorage.getSecret(settings.botToken);
		if (!botToken || !settings.channelUsername) {
			new Notice("Please set bot token and channel username in settings.");
			return;
		}

		const { brandLabel, brandItems, tasteItems, manualItems } =
			this.computeRelated(file);

		const options = await this.openModal({
			title: "Post to channel",
			submitLabel: "Post",
			showReplyLink: true,
			finalHashtag: settings.finalHashtag,
			brandLabel, brandItems, tasteItems, manualItems,
		});
		if (!options) return;

		const footer = buildFooterFromItems(options, brandLabel, settings);
		const postUrl = await this.execChannel(page, footer, options.format, options.replyLink, botToken);
		if (!postUrl) return;

		if (settings.externalLinkField) {
			await app.fileManager.processFrontMatter(file, (fm) => {
				fm[settings.externalLinkField] = postUrl;
			});
			new Notice(`Link saved to ${settings.externalLinkField} property.`);
		}
		if (settings.pubDateField) {
			const pubDate = new Date().toISOString().split("T")[0];
			await app.fileManager.processFrontMatter(file, (fm) => {
				fm[settings.pubDateField] = pubDate;
			});
		}
		if (settings.statusField && settings.publishedStatusValue) {
			await app.fileManager.processFrontMatter(file, (fm) => {
				fm[settings.statusField] = settings.publishedStatusValue;
			});
		} else if (settings.statusField && !settings.publishedStatusValue) {
			new Notice(
				"Status field is set but published status value is empty. Please set published status value in settings to update the status field.",
			);
		}
		await app.fileManager.processFrontMatter(file, (fm) => {
			fm["telegram_format"] = options.format;
		});
	}

	private async runUpdate() {
		const activeView =
			this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!activeView) return;

		const { app, settings } = this.plugin;
		const file = activeView.file;
		if (!file) return;

		const botToken = await app.secretStorage.getSecret(settings.botToken);
		if (!botToken) {
			new Notice("Please set bot token in settings.");
			return;
		}

		const cache = app.metadataCache.getFileCache(file);
		const postLink = cache?.frontmatter?.[settings.externalLinkField];
		if (!postLink || typeof postLink !== "string") {
			new Notice("No post link found in frontmatter. Publish the post first.");
			return;
		}

		let page = activeView.editor.getValue();
		page = page.replace(FRONTMATTER_RE, "").trim();
		if (!page) { new Notice("Please write something to send."); return; }

		const storedFormat = resolveStoredFormat(cache?.frontmatter?.["telegram_format"]);
		if (!storedFormat) {
			new Notice(
				"This post has no saved format (it may predate format tracking) — please verify Classic vs Rich text matches how it was originally sent before updating.",
			);
		}

		const { brandLabel, brandItems, tasteItems, manualItems } =
			this.computeRelated(file);

		const options = await this.openModal({
			title: "Update post",
			submitLabel: "Update",
			showReplyLink: false,
			finalHashtag: settings.finalHashtag,
			brandLabel, brandItems, tasteItems, manualItems,
			defaultFormat: storedFormat,
		});
		if (!options) return;

		const footer = buildFooterFromItems(options, brandLabel, settings);
		const ok = await this.execUpdate(postLink, page, footer, options.format, botToken);
		if (!ok) return;

		if (settings.updateDateField) {
			const updateDate = new Date().toISOString().split("T")[0];
			await app.fileManager.processFrontMatter(file, (fm) => {
				fm[settings.updateDateField] = updateDate;
			});
		}
	}

	// ── network ────────────────────────────────────────────────────────────

	private sendTelegramRequest(request: TelegramRequest): Promise<Response> {
		return fetch(request.url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(request.body),
		});
	}

	private async exec(message: string, footer: string, format: "html" | "md", botToken: string) {
		const { chatId, externalLinkField } = this.plugin.settings;
		const app = this.plugin.app;

		const request = buildTelegramRequest(
			{ message, footer, format, app, wikilinkExternalLinkField: externalLinkField },
			{ botToken, operation: "send", chatId },
		);
		const response = await this.sendTelegramRequest(request);

		if (response.ok) {
			new Notice("Message sent to Telegram ✅");
		} else {
			console.error("Telegram API error:", await response.text());
			new Notice("Failed to send message ❌");
		}
	}

	private async execChannel(
		message: string,
		footer: string,
		format: "html" | "md",
		replyLink: string,
		botToken: string,
	): Promise<string | null> {
		const { channelUsername, externalLinkField } = this.plugin.settings;
		const app = this.plugin.app;

		let replyToMessageId: number | undefined;
		if (replyLink.trim()) {
			const match = replyLink.match(
				/https?:\/\/t\.me\/(?:c\/\d+\/|[^/]+\/)(\d+)/,
			);
			if (match) {
				replyToMessageId = parseInt(match[1], 10);
			} else {
				new Notice("Provided reply link was invalid, ignoring it.");
			}
		}

		const chatId =
			channelUsername.startsWith("@") || channelUsername.startsWith("-100")
				? channelUsername
				: `@${channelUsername}`;

		const request = buildTelegramRequest(
			{ message, footer, format, app, wikilinkExternalLinkField: externalLinkField },
			{ botToken, operation: "send", chatId, replyToMessageId },
		);
		const response = await this.sendTelegramRequest(request);

		if (response.ok) {
			const json = await response.json();
			new Notice("Posted to channel ✅");
			if (channelUsername.startsWith("-100")) {
				return `https://t.me/c/${channelUsername.substring(4)}/${json.result.message_id}`;
			}
			const uname = channelUsername.startsWith("@")
				? channelUsername.substring(1)
				: channelUsername;
			return `https://t.me/${uname}/${json.result.message_id}`;
		}

		console.error("Telegram API error:", await response.text());
		new Notice("Failed to post to channel ❌");
		return null;
	}

	private async execUpdate(
		postLink: string,
		message: string,
		footer: string,
		format: "html" | "md",
		botToken: string,
	): Promise<boolean> {
		const { externalLinkField } = this.plugin.settings;
		const app = this.plugin.app;

		let chatId: string;
		let messageId: number;

		if (postLink.includes("/c/")) {
			const m = postLink.match(/https?:\/\/t\.me\/c\/(\d+)\/(\d+)/);
			if (!m) { new Notice("Invalid private Telegram post link ❌"); return false; }
			chatId = `-100${m[1]}`;
			messageId = parseInt(m[2], 10);
		} else {
			const m = postLink.match(/https?:\/\/t\.me\/([^/]+)\/(\d+)/);
			if (!m) { new Notice("Invalid Telegram post link ❌"); return false; }
			chatId = `@${m[1]}`;
			messageId = parseInt(m[2], 10);
		}

		const request = buildTelegramRequest(
			{ message, footer, format, app, wikilinkExternalLinkField: externalLinkField },
			{ botToken, operation: "edit", chatId, messageId },
		);
		const response = await this.sendTelegramRequest(request);

		if (response.ok) {
			new Notice("Post updated ✅");
			return true;
		}

		console.error("Telegram API error:", await response.text());
		new Notice("Failed to update post ❌");
		return false;
	}
}
