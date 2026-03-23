import { describe, expect, test } from "bun:test";
import { escapeMarkdownV2, parenthesesEscape, plusEscape, minusEscape } from "../src/helpers/escapers";

describe("escapers", () => {
	test.concurrent("escapeMarkdownV2", () => {
		expect(escapeMarkdownV2("Hello *world* [link](url)")).toBe("Hello \\*world\\* \\[link\\]\\(url\\)");
		expect(escapeMarkdownV2("~st~ `code` >quote")).toBe("\\~st\\~ \\`code\\` \\>quote");
		expect(escapeMarkdownV2("1 + 1 = 2 | a - b")).toBe("1 \\+ 1 \\= 2 \\| a \\- b");
	});

	test.concurrent("parenthesesEscape", () => {
		expect(parenthesesEscape("(hello)")).toBe("\\(hello\\)");
	});

	test.concurrent("plusEscape", () => {
		expect(plusEscape("1 + 1")).toBe("1 \\+ 1");
		expect(plusEscape("1 \\+ 1")).toBe("1 \\+ 1"); // already escaped
	});

	test.concurrent("minusEscape", () => {
		expect(minusEscape("1 - 1")).toBe("1 \\- 1");
		expect(minusEscape("1 \\- 1")).toBe("1 \\- 1"); // already escaped
	});
});
