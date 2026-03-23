import { describe, expect, test } from "bun:test";
import { convertToHTML } from "../src/helpers/htmlConverter";
import { App } from "obsidian";

const mockApp = {
	metadataCache: {
		getFirstLinkpathDest: () => null,
		getFileCache: () => null,
	},
} as unknown as App;

describe("htmlConverter", () => {
	test.concurrent("convertToHTML pipeline executes tokenizers and converters", () => {
		const input = "# Hello\n\nThis is **bold** and *italic*. [[MissingLink]]";
		const html = convertToHTML(input, "extLink", mockApp);
		
		expect(html).toContain("<b>Hello</b>");
		expect(html).toContain("<b>bold</b>");
		expect(html).toContain("<i>italic</i>");
		expect(html).toContain("MissingLink⚠️🔗");
	});
});
