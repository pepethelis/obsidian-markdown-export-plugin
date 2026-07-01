import { describe, expect, test } from "bun:test";
import { resolveStoredFormat } from "../src/helpers/telegramFormat";

describe("resolveStoredFormat", () => {
	test("returns 'html' when stored value is 'html'", () => {
		expect(resolveStoredFormat("html")).toBe("html");
	});

	test("returns 'md' when stored value is 'md'", () => {
		expect(resolveStoredFormat("md")).toBe("md");
	});

	test("returns undefined when field is missing (undefined)", () => {
		expect(resolveStoredFormat(undefined)).toBeUndefined();
	});

	test("returns undefined for an unrecognized string value", () => {
		expect(resolveStoredFormat("markdown")).toBeUndefined();
	});

	test("returns undefined for a non-string value", () => {
		expect(resolveStoredFormat(42)).toBeUndefined();
		expect(resolveStoredFormat(true)).toBeUndefined();
		expect(resolveStoredFormat(null)).toBeUndefined();
	});
});
