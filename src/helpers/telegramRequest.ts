import { App } from "obsidian";
import { convertToHTML } from "./htmlConverter";
import { convertToTgMd } from "./mdConverter";
import { PostRef, sameChat } from "./telegramLinks";

export type TelegramOperation = "send" | "edit";

export interface TelegramMessageInput {
	message: string;
	footer: string;
	format: "html" | "md";
	app: App;
	wikilinkExternalLinkField: string;
}

export interface TelegramRequestOptions {
	botToken: string;
	operation: TelegramOperation;
	chatId: string;
	messageId?: number;
	/** Post to reply to; may be in another chat (cross-chat reply). */
	replyTo?: PostRef;
}

export interface TelegramRequest {
	url: string;
	body: Record<string, unknown>;
}

/** Bot API limit for message text, counted after entity (HTML markup) parsing. */
export const TELEGRAM_TEXT_LIMIT = 4096;

/**
 * Approximates how many characters Telegram will count for an HTML-mode message:
 * tags are stripped and entities count as the single character they encode.
 */
export function htmlVisibleLength(html: string): number {
	return html.replace(/<[^>]*>/g, "").replace(/&(?:[a-zA-Z]+|#\d+|#x[0-9A-Fa-f]+);/g, "_")
		.length;
}

/**
 * Returns the visible length when an HTML-mode request exceeds the text limit,
 * or null when it fits. Rich (markdown) messages are not checked — their limit
 * is not documented the same way.
 */
export function textOverLimit(request: TelegramRequest): number | null {
	const text = request.body.text;
	if (typeof text !== "string") return null;
	const length = htmlVisibleLength(text);
	return length > TELEGRAM_TEXT_LIMIT ? length : null;
}

export function buildTelegramRequest(
	input: TelegramMessageInput,
	options: TelegramRequestOptions,
): TelegramRequest {
	const { message, footer, format, app, wikilinkExternalLinkField } = input;
	const { botToken, operation, chatId, messageId, replyTo } = options;
	const isEdit = operation === "edit";

	const body: Record<string, unknown> = { chat_id: chatId };
	if (messageId !== undefined) body.message_id = messageId;
	if (replyTo) {
		// reply_parameters.chat_id is only needed when the original is in another chat.
		body.reply_parameters = sameChat(replyTo.chatId, chatId)
			? { message_id: replyTo.messageId }
			: { message_id: replyTo.messageId, chat_id: replyTo.chatId };
	}

	if (format === "md") {
		const converted =
			convertToTgMd({ content: message, wikilinkExternalLinkField, app, isRich: true }) + footer;
		body.rich_message = { markdown: converted };
		// preserves pre-existing behavior: editRichMessage never set this field
		if (!isEdit) body.disable_web_page_preview = true;
		return {
			url: `https://api.telegram.org/bot${botToken}/${isEdit ? "editRichMessage" : "sendRichMessage"}`,
			body,
		};
	}

	const converted =
		convertToHTML({ content: message, app, wikilinkExternalLinkField, isRich: false }) + footer;
	body.text = converted;
	body.parse_mode = "HTML";
	body.disable_web_page_preview = true;
	return {
		url: `https://api.telegram.org/bot${botToken}/${isEdit ? "editMessageText" : "sendMessage"}`,
		body,
	};
}
