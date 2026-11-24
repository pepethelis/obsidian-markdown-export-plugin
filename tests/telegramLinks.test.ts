import { describe, expect, test } from "bun:test";
import { parsePostMessageId } from "../src/helpers/telegramLinks";

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
