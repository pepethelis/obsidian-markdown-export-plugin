import { describe, expect, test } from "bun:test";
import { describeTelegramError } from "../src/helpers/telegramError";

describe("describeTelegramError", () => {
	test("returns Telegram's description", () => {
		const body = JSON.stringify({
			ok: false,
			error_code: 400,
			description: "Bad Request: message is too long",
		});
		expect(describeTelegramError(400, body)).toBe("Bad Request: message is too long");
	});

	test("falls back to HTTP status for non-JSON bodies", () => {
		expect(describeTelegramError(502, "<html>Bad Gateway</html>")).toBe("HTTP 502");
	});

	test("falls back to HTTP status when description is missing or empty", () => {
		expect(describeTelegramError(401, JSON.stringify({ ok: false }))).toBe("HTTP 401");
		expect(describeTelegramError(401, JSON.stringify({ description: "  " }))).toBe("HTTP 401");
	});
});
