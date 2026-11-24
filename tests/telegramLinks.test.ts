import { describe, expect, test } from "bun:test";
import {
	channelChatId,
	channelPostUrl,
	parsePostMessageId,
	validateChannelUsername,
} from "../src/helpers/telegramLinks";

describe("parsePostMessageId", () => {
	test("parses public channel links", () => {
		expect(parsePostMessageId("https://t.me/my_channel/123")).toBe(123);
		expect(parsePostMessageId("  https://t.me/my_channel/45?single  ")).toBe(45);
	});

	test("parses private channel links", () => {
		expect(parsePostMessageId("https://t.me/c/1234567890/77")).toBe(77);
	});

	test("rejects non-post links", () => {
		expect(parsePostMessageId("https://t.me/my_channel")).toBeNull();
		expect(parsePostMessageId("https://example.com/a/1")).toBeNull();
		expect(parsePostMessageId("")).toBeNull();
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
