import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { Hono } from "hono";
import type { Env } from "../src/types.ts";

vi.mock("../src/domain/session.ts", () => ({
	addStamp: vi.fn(),
	getSessionData: vi.fn().mockResolvedValue({ stamps: [] }),
	findOrCreateUser: vi.fn(),
	createSession: vi.fn(),
	deleteSession: vi.fn(),
	getUserIdFromSession: vi.fn(),
}));

vi.mock("../src/domain/lectures.ts", () => ({
	getAvailableLectures: vi.fn(() => [
		{ id: "math", name: "Math" },
		{ id: "history", name: "History" },
	]),
}));

import { appRoutes } from "../src/web/routes.tsx";
import { addStamp, getSessionData } from "../src/domain/session.ts";

describe("calendar stamp routes", () => {
	let app: Hono<Env>;
	beforeEach(() => {
		(addStamp as Mock).mockClear();
		(getSessionData as Mock).mockClear();
		app = new Hono<Env>();
		app.use("*", async (c, next) => {
			c.set("user", { id: "user1", username: "test" });
			c.set("sessionId", "sess1");
			await next();
		});
		app.route("/", appRoutes);
	});

	it("returns modal HTML for valid date", async () => {
		const res = await app.request("/calendar/stamp-modal/2024-09-10");
		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toContain("<dialog");
		expect(text).toContain("Math");
	});

	it("rejects invalid date format for modal route", async () => {
		const res = await app.request("/calendar/stamp-modal/invalid-date");
		expect(res.status).toBe(400);
	});

	it("returns 401 when user missing for modal route", async () => {
		const noUserApp = new Hono<Env>();
		noUserApp.route("/", appRoutes);
		const res = await noUserApp.request("/calendar/stamp-modal/2024-09-10");
		expect(res.status).toBe(401);
	});

	it("adds stamp and returns updated grid", async () => {
		// Arrange: Configure the mock to return a new stamp *after* `addStamp` is called.
		const newStamp = {
			date: "2024-09-10",
			lectureName: "Math",
			iconUrl: "https://example.com/icons/math.png",
		};
		(getSessionData as Mock).mockReturnValue({
			user: { id: "user1", username: "test" },
			stamps: [newStamp],
		});

		// Act
		const res = await app.request("/calendar/stamp", {
			method: "POST",
			body: new URLSearchParams({
				date: "2024-09-10",
				lectureId: "math",
			}).toString(),
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
		});

		// Assert
		expect(res.status).toBe(200);
		const text = await res.text();
		expect(addStamp).toHaveBeenCalledWith("user1", "2024-09-10", "math");

		// Now, the important check: does the returned grid contain the stamp as an image?
                expect(text).toContain('cursor-default');
		expect(text).toContain('<img src="https://example.com/icons/math.png"');
		expect(text).toContain('alt="Math"');
	});

	it("handles errors during stamping", async () => {
		// Arrange: Make the addStamp function throw an error
		(addStamp as Mock).mockImplementation(() => {
			throw new Error("DB error");
		});

		// Act
		const res = await app.request("/calendar/stamp", {
			method: "POST",
			body: new URLSearchParams({
				date: "2024-09-10",
				lectureId: "math",
			}).toString(),
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
		});

		// Assert
		expect(res.status).toBe(500);
		const text = await res.text();
		expect(text).toContain("Failed to add stamp");
	});

	it("rejects invalid input for stamp route", async () => {
		const res = await app.request("/calendar/stamp", {
			method: "POST",
			body: new URLSearchParams({ date: "bad", lectureId: "math" }).toString(),
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
		});
		expect(res.status).toBe(400);
	});

	it("returns 401 when user missing for stamp route", async () => {
		const noUserApp = new Hono<Env>();
		noUserApp.route("/", appRoutes);
		const res = await noUserApp.request("/calendar/stamp", {
			method: "POST",
			body: new URLSearchParams({
				date: "2024-09-10",
				lectureId: "math",
			}).toString(),
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
		});
		expect(res.status).toBe(401);
	});
});

describe("general routes", () => {
	it("GET / - redirects to /calendar if user is logged in", async () => {
		const app = new Hono<Env>();
		app.use("*", async (c, next) => {
			c.set("user", { id: "user1", username: "testuser" });
			await next();
		});
		app.route("/", appRoutes);

		const res = await app.request("/");
		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toBe("/calendar");
	});

	it("GET / - shows login page if user is not logged in", async () => {
		const app = new Hono<Env>();
		app.route("/", appRoutes);
		const res = await app.request("/");
		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toContain("LINEでログイン");
	});

	it("GET /calendar - shows calendar page if user is logged in", async () => {
		const app = new Hono<Env>();
		app.use("*", async (c, next) => {
			c.set("user", { id: "user1", username: "testuser" });
			c.set("stamps", []);
			await next();
		});
		app.route("/", appRoutes);

		const res = await app.request("/calendar");
		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toContain("スタンプカレンダー");
		expect(text).toContain("testuser");
	});

	it("GET /calendar - redirects to / if user is not logged in", async () => {
		const app = new Hono<Env>();
		app.route("/", appRoutes);
		const res = await app.request("/calendar");
		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toBe("/");
	});

	it("GET /logout - clears session and redirects to /", async () => {
		const app = new Hono<Env>();
		app.route("/", appRoutes);
		const res = await app.request("/logout", {
			headers: {
				Cookie: "sessionId=some-session-id",
			},
		});
		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toBe("/");
		// Check that the cookie is being cleared
		const cookieHeader = res.headers.get("Set-Cookie");
		expect(cookieHeader).toContain("sessionId=;");
		expect(cookieHeader).toContain("Expires=Thu, 01 Jan 1970");
	});
});
