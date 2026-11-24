import { describe, expect, test } from "bun:test";
import {
	channelChatId,
	channelPostUrl,
	parsePostLink,
	sameChat,
	validateChannelUsername,
} from "../src/helpers/telegramLinks";

describe("parsePostLink", () => {
	test("parses public channel links", () => {
		expect(parsePostLink("https://t.me/kallection/40308")).toEqual({ chatId: "@kallection", messageId: 40308 });
		expect(parsePostLink("  https://t.me/my_channel/45?single  ")).toEqual({ chatId: "@my_channel", messageId: 45 });
	});

	test("parses private channel links", () => {
		expect(parsePostLink("https://t.me/c/1403600379/77")).toEqual({ chatId: "-1001403600379", messageId: 77 });
	});

	test("rejects non-post links", () => {
		expect(parsePostLink("https://t.me/my_channel")).toBeNull();
		expect(parsePostLink("https://example.com/a/1")).toBeNull();
		expect(parsePostLink("")).toBeNull();
	});
});

describe("sameChat", () => {
	test("compares case-insensitively", () => {
		expect(sameChat("@Kallection", "@kallection")).toBe(true);
		expect(sameChat("@kallection", "-1001403600379")).toBe(false);
	});
});

describe("validateChannelUsername", () => {
	test("accepts usernames and -100 ids", () => {
		expect(validateChannelUsername("@kallection")).toBeUndefined();
		expect(validateChannelUsername("kallection")).toBeUndefined();
		expect(validateChannelUsername("-1001234567890")).toBeUndefined();
	});

	test("rejects short, empty or malformed values", () => {
		expect(validateChannelUsername("@abc")).toBeString();
		expect(validateChannelUsername("")).toBeString();
		expect(validateChannelUsername("12345")).toBeString();
	});
});

describe("channelChatId / channelPostUrl", () => {
	test("normalizes usernames", () => {
		expect(channelChatId("kallection")).toBe("@kallection");
		expect(channelChatId("@kallection")).toBe("@kallection");
		expect(channelChatId("-1001234")).toBe("-1001234");
	});

	test("builds public and private post links", () => {
		expect(channelPostUrl("kallection", 5)).toBe("https://t.me/kallection/5");
		expect(channelPostUrl("@kallection", 5)).toBe("https://t.me/kallection/5");
		expect(channelPostUrl("-1001234", 5)).toBe("https://t.me/c/1234/5");
	});
});
