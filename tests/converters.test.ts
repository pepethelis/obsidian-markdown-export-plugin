import { describe, expect, test } from "bun:test";
import { convertWikilinks } from "../src/helpers/converters";
import { App } from "obsidian";

const mockApp = {
	metadataCache: {
		getFirstLinkpathDest: (path: string) => {
			if (path === "published_doc") return { path: "published_doc.md" };
			if (path === "draft_doc") return { path: "draft_doc.md" };
			return null;
		},
		getFileCache: (file: any) => {
			if (file.path === "published_doc.md") {
				return {
					frontmatter: {
						status: "Published",
						extLink: "https://example.com/doc",
					},
				};
			}
			if (file.path === "draft_doc.md") {
				return { frontmatter: { status: "Draft" } };
			}
			return null;
		},
	},
} as unknown as App;

describe("converters", () => {
	test("convertWikilinks with existing published document", () => {
		const result = convertWikilinks(
			"[[published_doc|Click Here]]",
			mockApp,
			"extLink",
		);
		expect(result).toBe("[Click Here](https://example.com/doc)");
	});

	test("convertWikilinks with missing document", () => {
		const result = convertWikilinks("[[missing_doc]]", mockApp, "extLink");
		expect(result).toBe("missing_doc⚠️🔗");
	});

	test("convertWikilinks with draft document", () => {
		const result = convertWikilinks("[[draft_doc]]", mockApp, "extLink");
		expect(result).toBe("draft_doc⏳");
	});

	test("convertWikilinks without display override", () => {
		const result = convertWikilinks(
			"[[published_doc]]",
			mockApp,
			"extLink",
		);
		expect(result).toBe("[published_doc](https://example.com/doc)");
	});

	test("convertWikilinks preserves existing HTML entities", () => {
		const result = convertWikilinks(
			"[[published_doc|Rock &amp; Roll]]",
			mockApp,
			"extLink",
		);
		expect(result).toBe("[Rock &amp; Roll](https://example.com/doc)");
	});
});
