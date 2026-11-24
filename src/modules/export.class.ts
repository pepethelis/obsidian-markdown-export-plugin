import { MarkdownView, Notice, RequestUrlResponse, TFile, requestUrl } from "obsidian";
import { buildFooterFromItems } from "../helpers/footerBuilder";
import { resolveStoredFormat } from "../helpers/telegramFormat";
import {
	buildTelegramRequest,
	TELEGRAM_TEXT_LIMIT,
	TelegramRequest,
	textOverLimit,
} from "../helpers/telegramRequest";
import { describeTelegramError } from "../helpers/telegramError";
import { channelChatId, channelPostUrl } from "../helpers/telegramLinks";
import {
	computeBrandRelated,
	computeTasteRelated,
	computeAuthorRelated,
	computeManualRelated,
	computeTypeRelated,
	scanOtherMarkdownFiles,
} from "../helpers/relatedBuilder";
import {
	ExportSettingsModal,
	ModalParams,
} from "../modals/export-settings.modal";
import { confirmAction } from "../modals/confirm";
import { promptReplyMessageId } from "../modals/reply-link.modal";
import { Channel, ExportOptions } from "../types";
import TelegramExportPlugin from "../plugin.class";

interface TelegramResponse {
	ok: boolean;
	result?: { message_id?: number };
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

export class Export {
	private plugin: TelegramExportPlugin;

	constructor(plugin: TelegramExportPlugin) {
		this.plugin = plugin;

		plugin.addRibbonIcon("send", "Export full page", () => this.runFullPage());
		plugin.addRibbonIcon("scissors", "Export selection", () => this.runSelection());
		plugin.addRibbonIcon("arrow-up-right", "Post to channel", () => this.runChannel());
		plugin.addRibbonIcon("pencil-line", "Update post", () => this.runUpdate());

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
			id: "post-to-channel-as-reply",
			name: "Post to channel as reply",
			editorCallback: () => this.runChannelReply(),
		});

		plugin.addCommand({
			id: "update-post",
			name: "Update post",
			// Only offered for notes that were already posted to the channel.
			editorCheckCallback: (checking, _editor, ctx) => {
				if (!ctx.file || !this.hasPostLink(ctx.file)) return false;
				if (!checking) this.runUpdate();
				return true;
			},
		});

		// Note "⋯" menu (the main entry point on mobile) and the file explorer menu.
		plugin.registerEvent(
			plugin.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFile) || file !== this.activeFile()) return;
				menu.addSeparator();
				menu.addItem((item) =>
					item.setTitle("Export to Telegram").setIcon("send").onClick(() => this.runFullPage()),
				);
				menu.addItem((item) =>
					item.setTitle("Post to channel").setIcon("arrow-up-right").onClick(() => this.runChannel()),
				);
				menu.addItem((item) =>
					item
						.setTitle("Post to channel as reply")
						.setIcon("reply")
						.onClick(() => this.runChannelReply()),
				);
				if (this.hasPostLink(file)) {
					menu.addItem((item) =>
						item.setTitle("Update channel post").setIcon("pencil-line").onClick(() => this.runUpdate()),
					);
				}
			}),
		);

		// Editor context menu: offer exporting the current selection.
		plugin.registerEvent(
			plugin.app.workspace.on("editor-menu", (menu, editor) => {
				if (!editor.somethingSelected()) return;
				menu.addItem((item) =>
					item
						.setTitle("Export selection to Telegram")
						.setIcon("scissors")
						.onClick(() => this.runSelection()),
				);
			}),
		);
	}

	private activeFile(): TFile | null {
		return this.plugin.app.workspace.getActiveViewOfType(MarkdownView)?.file ?? null;
	}

	private hasPostLink(file: TFile): boolean {
		const field = this.plugin.settings.externalLinkField;
		if (!field) return false;
		const link = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter?.[field];
		return typeof link === "string" && link.length > 0;
	}

	// ── helpers ────────────────────────────────────────────────────────────

	private computeRelated(file: TFile | null) {
		const { app, settings } = this.plugin;
		if (!file) return { brandLabel: "", brandItems: [], typeItems: [], tasteItems: [], authorItems: [], manualItems: [] };
		const candidates = scanOtherMarkdownFiles(app, file);
		const { label: brandLabel, items: brandItems } = computeBrandRelated(app, file, settings, candidates);
		const typeItems = computeTypeRelated(app, file, settings, candidates);
		const tasteItems = computeTasteRelated(app, file, settings, candidates);
		const authorItems = computeAuthorRelated(app, file, settings, candidates);
		const manualItems = computeManualRelated(app, file, settings);
		return { brandLabel, brandItems, typeItems, tasteItems, authorItems, manualItems };
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

		const { brandLabel, brandItems, typeItems, tasteItems, authorItems, manualItems } =
			this.computeRelated(activeView.file);

		const options = await this.openModal({
			title: "Export page",
			submitLabel: "Export",
			finalHashtag: settings.finalHashtag,
			brandLabel, brandItems, typeItems, tasteItems, authorItems, manualItems,
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

		const { brandLabel, brandItems, typeItems, tasteItems, authorItems, manualItems } =
			this.computeRelated(activeView.file);

		const options = await this.openModal({
			title: "Export selection",
			submitLabel: "Export",
			finalHashtag: settings.finalHashtag,
			brandLabel, brandItems, typeItems, tasteItems, authorItems, manualItems,
		});
		if (!options) return;

		const footer = buildFooterFromItems(options, brandLabel, settings);
		await this.exec(selectedText, footer, options.format, botToken);
	}

	private async runChannelReply() {
		const replyToMessageId = await promptReplyMessageId(this.plugin.app);
		if (replyToMessageId === null) return;
		await this.runChannel(replyToMessageId);
	}

	private async runChannel(replyToMessageId?: number) {
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
		if (!botToken || settings.channels.length === 0) {
			new Notice("Please set bot token and add a channel in settings.");
			return;
		}

		const { brandLabel, brandItems, typeItems, tasteItems, authorItems, manualItems } =
			this.computeRelated(file);

		const options = await this.openModal({
			title: "Post to channel",
			submitLabel: "Post",
			finalHashtag: settings.finalHashtag,
			channels: settings.channels,
			brandLabel, brandItems, typeItems, tasteItems, authorItems, manualItems,
		});
		if (!options) return;

		const channel = settings.channels[options.channelIndex ?? 0];
		if (!channel) return;

		const footer = buildFooterFromItems(options, brandLabel, settings);
		const postUrl = await this.execChannel(
			channel, page, footer, options.format, replyToMessageId, botToken,
		);
		if (!postUrl) return;
		if (!channel.updateNote) return;

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

		const { brandLabel, brandItems, typeItems, tasteItems, authorItems, manualItems } =
			this.computeRelated(file);

		const options = await this.openModal({
			title: "Update post",
			submitLabel: "Update",
			finalHashtag: settings.finalHashtag,
			brandLabel, brandItems, typeItems, tasteItems, authorItems, manualItems,
			defaultFormat: storedFormat,
		});
		if (!options) return;

		const confirmed = await confirmAction(app, {
			title: "Update channel post?",
			message: `The published post will be replaced with the current note text.\n${postLink}`,
			confirmLabel: "Update post",
			destructive: true,
		});
		if (!confirmed) return;

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

	/**
	 * Sends a request to the Bot API. Returns the parsed response on success;
	 * on any failure shows a notice titled `failTitle` and returns null.
	 */
	private async send(
		request: TelegramRequest,
		failTitle: string,
	): Promise<TelegramResponse | null> {
		const tooLong = textOverLimit(request);
		if (tooLong !== null) {
			new Notice(
				`${failTitle} ❌
Message is too long: ~${tooLong} of ${TELEGRAM_TEXT_LIMIT} characters. ` +
					"Turn off some related sections or shorten the text.",
				10000,
			);
			return null;
		}

		// requestUrl goes through Obsidian's native networking (no CORS limits on
		// mobile); `throw: false` lets us read the error body for non-2xx answers.
		let response: RequestUrlResponse;
		try {
			response = await requestUrl({
				url: request.url,
				method: "POST",
				contentType: "application/json",
				body: JSON.stringify(request.body),
				throw: false,
			});
		} catch (e) {
			console.error("Telegram request failed:", e);
			new Notice(`${failTitle} ❌
Network error: ${e instanceof Error ? e.message : String(e)}`, 10000);
			return null;
		}

		const bodyText = response.text;
		if (response.status < 200 || response.status >= 300) {
			console.error("Telegram API error:", bodyText);
			new Notice(`${failTitle} ❌
${describeTelegramError(response.status, bodyText)}`, 10000);
			return null;
		}
		return JSON.parse(bodyText) as TelegramResponse;
	}

	private async exec(message: string, footer: string, format: "html" | "md", botToken: string) {
		const { chatId, externalLinkField } = this.plugin.settings;
		const app = this.plugin.app;

		const request = buildTelegramRequest(
			{ message, footer, format, app, wikilinkExternalLinkField: externalLinkField },
			{ botToken, operation: "send", chatId },
		);
		if (await this.send(request, "Failed to send message")) {
			new Notice("Message sent to Telegram ✅");
		}
	}

	private async execChannel(
		channel: Channel,
		message: string,
		footer: string,
		format: "html" | "md",
		replyToMessageId: number | undefined,
		botToken: string,
	): Promise<string | null> {
		const { externalLinkField } = this.plugin.settings;
		const app = this.plugin.app;
		const chatId = channelChatId(channel.username);

		const request = buildTelegramRequest(
			{ message, footer, format, app, wikilinkExternalLinkField: externalLinkField },
			{ botToken, operation: "send", chatId, replyToMessageId },
		);
		const json = await this.send(request, "Failed to post to channel");
		if (!json) return null;

		new Notice(`Posted to ${channel.name} ✅`);
		return channelPostUrl(channel.username, json.result?.message_id);
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
		if (!(await this.send(request, "Failed to update post"))) return false;

		new Notice("Post updated ✅");
		return true;
	}
}
