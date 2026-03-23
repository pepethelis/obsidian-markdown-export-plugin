import { describe, expect, test } from "bun:test";
import { tokenizeMethods } from "../src/helpers/tokenizers";

// Helper to find tokenizers by name since they are not exported directly
const getTokenizer = (name: string) => {
	const method = tokenizeMethods.find((m) => m.name === name);
	if (!method) throw new Error(`Tokenizer ${name} not found`);
	return method;
};

// export const tokenizeMethods = [
// 	tokenizeUnderline,
// 	tokenizeTables,
// 	tokenizeBulletedLists,
// 	tokenizeNumberedLists,
// ];

describe.concurrent("tokenizers", () => {
	test.concurrent("tokenizeHeaders", () => {
		const tokenizeHeaders = getTokenizer("tokenizeHeaders");
		expect(tokenizeHeaders("# Header 1")).toBe("<b>Header 1</b>\n");
		expect(tokenizeHeaders("###### Header 6")).toBe("<b>Header 6</b>\n");
	});

	test.concurrent("tokenizeBold", () => {
		const tokenizeBold = getTokenizer("tokenizeBold");
		expect(tokenizeBold("**bold text**")).toBe("<b>bold text</b>");
		expect(tokenizeBold("__bold text__")).toBe("<b>bold text</b>");
	});

	test.concurrent("tokenizeItalics", () => {
		const tokenizeItalics = getTokenizer("tokenizeItalics");
		expect(tokenizeItalics("*italic text*")).toBe("<i>italic text</i>");
	});

	test.concurrent("tokenizeStrikethrough", () => {
		const tokenizeStrikethrough = getTokenizer("tokenizeStrikethrough");
		expect(tokenizeStrikethrough("~~strike~~")).toBe("<s>strike</s>");
	});

	test.concurrent("tokenizeInlineCode", () => {
		const tokenizeInlineCode = getTokenizer("tokenizeInlineCode");
		expect(tokenizeInlineCode("`code`")).toBe("<code>code</code>");
	});

	test.concurrent("tokenizeCodeBlock", () => {
		const tokenizeCodeBlock = getTokenizer("tokenizeCodeBlock");
		expect(tokenizeCodeBlock("```\ncode block\n```")).toBe("<pre>code block</pre>");
	});

	test.concurrent("tokenizeLinks", () => {
		const tokenizeLinks = getTokenizer("tokenizeLinks");
		expect(tokenizeLinks("[Google](https://google.com)")).toBe('<a href="https://google.com">Google</a>');
	});

	test.concurrent("tokenizeSpoilers", () => {
		const tokenizeSpoilers = getTokenizer("tokenizeSpoilers");
		expect(tokenizeSpoilers("||secret||")).toBe("<tg-spoiler>secret</tg-spoiler>");
	});

	test.concurrent("tokenizeComments", () => {
		const tokenizeComments = getTokenizer("tokenizeComments");
		expect(tokenizeComments("%% hidden %%")).toBe("");
	});

	test.concurrent("tokenizeCheckboxes", () => {
		const tokenizeCheckboxes = getTokenizer("tokenizeCheckboxes");
		expect(tokenizeCheckboxes("- [ ] Unchecked")).toBe("⏹️ Unchecked");
		expect(tokenizeCheckboxes("- [x] Checked")).toBe("☑️ Checked");
	});

	test.concurrent("tokenizeCallouts", () => {
		const tokenizeCallouts = getTokenizer("tokenizeCallouts");
		expect(tokenizeCallouts("> [!info] My Title\n> Some info")).toBe("<blockquote>ℹ️ <b>My Title</b>\nSome info\n</blockquote>");
	});

	test.concurrent("tokenizeBlockquote", () => {
		const tokenizeBlockquote = getTokenizer("tokenizeBlockquote");
		expect(tokenizeBlockquote("> Quote line 1\n> Quote line 2")).toBe("<blockquote>Quote line 1\nQuote line 2</blockquote>");
	});

	test.concurrent("tokenizeUnderline", () => {
		const tokenizeUnderline = getTokenizer("tokenizeUnderline");
		expect(tokenizeUnderline("<u>underline</u>")).toBe("<u>underline</u>");
	});

	test.concurrent("tokenizeTables", () => {
		const tokenizeTables = getTokenizer("tokenizeTables");
		const tableContent = "| heading 1 | heading 2 |\n|---|---|\n| cell 1 | cell 2 |\n";
		expect(tokenizeTables(tableContent)).toBe("<pre><code>| heading 1 | heading 2 |\n|---|---|\n| cell 1 | cell 2 |</code></pre>\n");
	});

	test.concurrent("tokenizeBulletedLists", () => {
		const tokenizeBulletedLists = getTokenizer("tokenizeBulletedLists");
		expect(tokenizeBulletedLists("- list item")).toBe("- list item");
	});

	test.concurrent("tokenizeNumberedLists", () => {
		const tokenizeNumberedLists = getTokenizer("tokenizeNumberedLists");
		expect(tokenizeNumberedLists("1. list item")).toBe("1. list item");
	});
});
