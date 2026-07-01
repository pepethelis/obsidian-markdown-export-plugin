import { describe, expect, test } from "bun:test";
import { buildFooterFromItems } from "../src/helpers/footerBuilder";
import { ExportOptions, MyPluginSettings, RelatedSection } from "../src/types";

const baseSettings: MyPluginSettings = {
	botToken: "key",
	chatId: "chat",
	externalLinkField: "link",
	pubDateField: "",
	updateDateField: "",
	statusField: "",
	publishedStatusValue: "",
	channelUsername: "",
	finalHashtag: "#огляди",
};

const noSection: RelatedSection = { enabled: false, items: [] };

function makeOptions(overrides: Partial<ExportOptions> = {}): ExportOptions {
	return {
		format: "html",
		includeHashtag: false,
		replyLink: "",
		brandRelated: noSection,
		tasteRelated: noSection,
		manualRelated: noSection,
		...overrides,
	};
}

function item(url: string, name: string, enabled = true) {
	return { url, name, enabled };
}

// ── empty / short-circuit ─────────────────────────────────────────────────

describe("buildFooterFromItems — empty cases", () => {
	test("all sections disabled, no hashtag → empty string", () => {
		expect(buildFooterFromItems(makeOptions(), "", baseSettings)).toBe("");
	});

	test("section enabled but all items disabled, no hashtag → empty string", () => {
		const options = makeOptions({
			brandRelated: {
				enabled: true,
				items: [item("https://t.me/1", "X", false)],
			},
		});
		expect(buildFooterFromItems(options, "Beer", baseSettings)).toBe("");
	});

	test("section enabled but empty items list, no hashtag → empty string", () => {
		const options = makeOptions({
			brandRelated: { enabled: true, items: [] },
		});
		expect(buildFooterFromItems(options, "Beer", baseSettings)).toBe("");
	});

	test("no finalHashtag in settings, includeHashtag true → empty string", () => {
		const settings = { ...baseSettings, finalHashtag: "" };
		const options = makeOptions({ includeHashtag: true });
		expect(buildFooterFromItems(options, "", settings)).toBe("");
	});
});

// ── hashtag only ──────────────────────────────────────────────────────────

describe("buildFooterFromItems — hashtag only", () => {
	test("HTML: hashtag returned when no items", () => {
		const options = makeOptions({ includeHashtag: true });
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).toBe("\n\n#огляди");
	});

	test("MD: hashtag # is escaped to \\#", () => {
		const options = makeOptions({ format: "md", includeHashtag: true });
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).toContain("\\#огляди");
		// raw unescaped # must not appear right before the word
		expect(result).not.toMatch(/(?<!\\)#огляди/);
	});

	test("MD: hashtag-only result contains separator line", () => {
		const options = makeOptions({ format: "md", includeHashtag: true });
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).toContain("---");
	});

	test("HTML: hashtag containing & is escaped to &amp;", () => {
		const settings = { ...baseSettings, finalHashtag: "#a&b" };
		const options = makeOptions({ includeHashtag: true });
		const result = buildFooterFromItems(options, "", settings);
		expect(result).toContain("#a&amp;b");
		expect(result).not.toContain("#a&b");
	});

	test("HTML: hashtag containing < is escaped to &lt;", () => {
		const settings = { ...baseSettings, finalHashtag: "#<script>" };
		const options = makeOptions({ includeHashtag: true });
		const result = buildFooterFromItems(options, "", settings);
		expect(result).toContain("#&lt;script&gt;");
		expect(result).not.toContain("#<script>");
	});
});

// ── URL encoding in HTML hrefs ────────────────────────────────────────────

describe("htmlLink URL encoding", () => {
	test("& in URL is encoded to &amp; in href", () => {
		const options = makeOptions({
			brandRelated: {
				enabled: true,
				items: [item("https://example.com/?a=1&b=2", "Item")],
			},
		});
		const result = buildFooterFromItems(options, "Brand", baseSettings);
		expect(result).toContain('href="https://example.com/?a=1&amp;b=2"');
		expect(result).not.toContain('href="https://example.com/?a=1&b=2"');
	});

	test('" in URL is encoded to &quot; in href', () => {
		const options = makeOptions({
			brandRelated: {
				enabled: true,
				items: [item('https://example.com/?q="hi"', "Item")],
			},
		});
		const result = buildFooterFromItems(options, "Brand", baseSettings);
		expect(result).toContain('href="https://example.com/?q=&quot;hi&quot;"');
	});

	test("multiple & in URL are all encoded", () => {
		const options = makeOptions({
			manualRelated: {
				enabled: true,
				items: [item("https://example.com/?a=1&b=2&c=3", "Item")],
			},
		});
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).toContain("a=1&amp;b=2&amp;c=3");
	});
});

// ── ] escaping in Markdown link text ─────────────────────────────────────

describe("mdLink ] escaping", () => {
	test("] in note name is escaped to \\]", () => {
		const options = makeOptions({
			format: "md",
			brandRelated: {
				enabled: true,
				items: [item("https://example.com/", "iPhone [SE]")],
			},
		});
		const result = buildFooterFromItems(options, "Apple", baseSettings);
		// only ] is escaped, [ is left as-is
		expect(result).toContain("[iPhone [SE\\]](https://example.com/)");
		expect(result).not.toContain("[iPhone [SE]](");
	});

	test("name without ] is unchanged", () => {
		const options = makeOptions({
			format: "md",
			brandRelated: {
				enabled: true,
				items: [item("https://example.com/", "Normal Name")],
			},
		});
		const result = buildFooterFromItems(options, "Brand", baseSettings);
		expect(result).toContain("[Normal Name](https://example.com/)");
	});
});

// ── section content ───────────────────────────────────────────────────────

describe("buildFooterFromItems — section content", () => {
	test("disabled section excluded even when items are present", () => {
		const options = makeOptions({
			brandRelated: {
				enabled: false,
				items: [item("https://t.me/1", "ShouldNotAppear")],
			},
		});
		const result = buildFooterFromItems(options, "Brand", baseSettings);
		expect(result).not.toContain("ShouldNotAppear");
	});

	test("disabled item within enabled section is excluded", () => {
		const options = makeOptions({
			brandRelated: {
				enabled: true,
				items: [
					item("https://t.me/1", "Included", true),
					item("https://t.me/2", "Excluded", false),
				],
			},
		});
		const result = buildFooterFromItems(options, "Brand", baseSettings);
		expect(result).toContain("Included");
		expect(result).not.toContain("Excluded");
	});

	test("brand section label uses brandLabel parameter", () => {
		const options = makeOptions({
			brandRelated: {
				enabled: true,
				items: [item("https://t.me/1", "Item")],
			},
		});
		const result = buildFooterFromItems(options, "Monster", baseSettings);
		expect(result).toContain("Більше Monster:");
	});

	test("empty brandLabel skips brand section", () => {
		const options = makeOptions({
			brandRelated: {
				enabled: true,
				items: [item("https://t.me/1", "Item")],
			},
			tasteRelated: {
				enabled: true,
				items: [item("https://t.me/2", "Taste")],
			},
		});
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).not.toContain("Більше");
		expect(result).toContain("Схожий смак:");
	});

	test("taste section uses 'Схожий смак:' label", () => {
		const options = makeOptions({
			tasteRelated: {
				enabled: true,
				items: [item("https://t.me/1", "Item")],
			},
		});
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).toContain("Схожий смак:");
	});

	test("manual section uses 'Пов'язані огляди:' label", () => {
		const options = makeOptions({
			manualRelated: {
				enabled: true,
				items: [item("https://t.me/1", "Item")],
			},
		});
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).toContain("Пов'язані огляди:");
	});
});

// ── format differences ────────────────────────────────────────────────────

describe("buildFooterFromItems — HTML vs MD format", () => {
	test("HTML: links use <a href> tags", () => {
		const options = makeOptions({
			tasteRelated: {
				enabled: true,
				items: [item("https://t.me/1", "Item")],
			},
		});
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).toContain("<a href=");
		expect(result).not.toContain("[Item](");
	});

	test("MD: links use [text](url) format", () => {
		const options = makeOptions({
			format: "md",
			tasteRelated: {
				enabled: true,
				items: [item("https://t.me/1", "Item")],
			},
		});
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).toContain("[Item](https://t.me/1)");
		expect(result).not.toContain("<a href=");
	});

	test("MD: result starts with \\n\\n followed by --- separator", () => {
		const options = makeOptions({
			format: "md",
			tasteRelated: {
				enabled: true,
				items: [item("https://t.me/1", "Item")],
			},
		});
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result.startsWith("\n\n\n---\n")).toBe(true);
	});

	test("HTML: sections separated by single \\n (not double)", () => {
		const options = makeOptions({
			tasteRelated: {
				enabled: true,
				items: [item("https://t.me/1", "A")],
			},
			manualRelated: {
				enabled: true,
				items: [item("https://t.me/2", "B")],
			},
		});
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).toContain("Схожий смак:");
		expect(result).toContain("Пов'язані огляди:");
		// Between the two sections there should be exactly one newline
		const betweenSections = result.split("Схожий смак:")[1].split("Пов'язані")[0];
		expect(betweenSections).not.toContain("\n\n");
	});

	test("MD: multiple sections separated by \\n\\n", () => {
		const options = makeOptions({
			format: "md",
			tasteRelated: {
				enabled: true,
				items: [item("https://t.me/1", "A")],
			},
			manualRelated: {
				enabled: true,
				items: [item("https://t.me/2", "B")],
			},
		});
		const result = buildFooterFromItems(options, "", baseSettings);
		expect(result).toContain("Схожий смак:");
		expect(result).toContain("Пов'язані огляди:");
		// The --- divider plus double-newline section sep means \n\n appears
		expect(result).toContain("\n\n");
	});

	test("MD: hashtag appended to last section with \\n\\n", () => {
		const options = makeOptions({
			format: "md",
			tasteRelated: {
				enabled: true,
				items: [item("https://t.me/1", "Item")],
			},
			includeHashtag: true,
		});
		const result = buildFooterFromItems(options, "", baseSettings);
		// hashtag joined to last section part, not as a standalone section
		expect(result).toContain("Схожий смак:");
		expect(result).toContain("\\#огляди");
		// should only have one --- block
		expect((result.match(/---/g) ?? []).length).toBe(1);
	});
});
