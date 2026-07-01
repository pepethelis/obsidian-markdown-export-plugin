import { describe, expect, test } from "bun:test";
import { App } from "obsidian";
import { buildTelegramRequest } from "../src/helpers/telegramRequest";

// Content with no wikilinks never touches `app`, so an empty stub is enough here.
const app = {} as unknown as App;

describe("buildTelegramRequest — send (html)", () => {
	test("targets sendMessage with HTML body", () => {
		const request = buildTelegramRequest(
			{ message: "hello", footer: "", format: "html", app, wikilinkExternalLinkField: "link" },
			{ botToken: "TOKEN", operation: "send", chatId: "123" },
		);
		expect(request.url).toBe("https://api.telegram.org/botTOKEN/sendMessage");
		expect(request.body).toMatchObject({
			chat_id: "123",
			text: "hello",
			parse_mode: "HTML",
			disable_web_page_preview: true,
		});
		expect(request.body.reply_to_message_id).toBeUndefined();
		expect(request.body.message_id).toBeUndefined();
	});

	test("includes reply_to_message_id when provided", () => {
		const request = buildTelegramRequest(
			{ message: "hello", footer: "", format: "html", app, wikilinkExternalLinkField: "link" },
			{ botToken: "TOKEN", operation: "send", chatId: "@chan", replyToMessageId: 42 },
		);
		expect(request.body.reply_to_message_id).toBe(42);
	});

	test("appends footer to converted text", () => {
		const request = buildTelegramRequest(
			{ message: "hello", footer: "\n\nFOOTER", format: "html", app, wikilinkExternalLinkField: "link" },
			{ botToken: "TOKEN", operation: "send", chatId: "123" },
		);
		expect(request.body.text).toBe("hello\n\nFOOTER");
	});
});

describe("buildTelegramRequest — send (md)", () => {
	test("targets sendRichMessage with rich_message body and disable_web_page_preview", () => {
		const request = buildTelegramRequest(
			{ message: "hello", footer: "", format: "md", app, wikilinkExternalLinkField: "link" },
			{ botToken: "TOKEN", operation: "send", chatId: "123" },
		);
		expect(request.url).toBe("https://api.telegram.org/botTOKEN/sendRichMessage");
		expect(request.body).toMatchObject({
			chat_id: "123",
			rich_message: { markdown: "hello" },
			disable_web_page_preview: true,
		});
	});
});

describe("buildTelegramRequest — edit (html)", () => {
	test("targets editMessageText with message_id and disable_web_page_preview", () => {
		const request = buildTelegramRequest(
			{ message: "hello", footer: "", format: "html", app, wikilinkExternalLinkField: "link" },
			{ botToken: "TOKEN", operation: "edit", chatId: "@chan", messageId: 99 },
		);
		expect(request.url).toBe("https://api.telegram.org/botTOKEN/editMessageText");
		expect(request.body).toMatchObject({
			chat_id: "@chan",
			message_id: 99,
			text: "hello",
			parse_mode: "HTML",
			disable_web_page_preview: true,
		});
	});
});

describe("buildTelegramRequest — edit (md)", () => {
	test("targets editRichMessage and omits disable_web_page_preview (matches legacy behavior)", () => {
		const request = buildTelegramRequest(
			{ message: "hello", footer: "", format: "md", app, wikilinkExternalLinkField: "link" },
			{ botToken: "TOKEN", operation: "edit", chatId: "@chan", messageId: 99 },
		);
		expect(request.url).toBe("https://api.telegram.org/botTOKEN/editRichMessage");
		expect(request.body).toMatchObject({
			chat_id: "@chan",
			message_id: 99,
			rich_message: { markdown: "hello" },
		});
		expect(request.body.disable_web_page_preview).toBeUndefined();
	});
});
