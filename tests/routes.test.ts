import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { Hono } from "hono";
import type { Env } from "../src/types.ts";
import {
	fail,
	ok,
	DomainError,
	NotFoundError,
	UnauthorizedError,
} from "../src/lib/result.ts";
import { errorHandler } from "../src/web/middleware/errorHandler.tsx";

vi.mock("../src/domain/session.ts", () => ({
	addStampForSession: vi.fn(),
	findOrCreateUser: vi.fn(),
	createSession: vi.fn(),
	deleteSession: vi.fn(),
	getValidSession: vi.fn(),
}));

vi.mock("../src/domain/lectures.ts", () => ({
        getAvailableLectures: vi.fn(() => [
                { id: "math", name: "Math" },
                { id: "history", name: "History" },
        ]),
}));

vi.mock("../src/domain/calendar.ts", async () => {
        const actual = await vi.importActual<
                typeof import("../src/domain/calendar.ts")
        >("../src/domain/calendar.ts");
        return {
                ...actual,
                getCurrentMonth: vi.fn(() => ({
                        year: 2024,
                        month: 8, // September
                        dates: actual.getMonthDates(2024, 8),
                })),
        };
});

import { appRoutes } from "../src/web/routes.tsx";
import { addStampForSession } from "../src/domain/session.ts";

describe("calendar stamp routes", () => {
	let app: Hono<Env>;

	beforeEach(() => {
		(addStampForSession as Mock).mockClear();
		app = new Hono<Env>();
		// Register the new global error handler for all tests in this suite
		app.onError(errorHandler);
		app.use("*", async (c, next) => {
			c.set("user", { id: "user1", username: "test" });
			c.set("sessionId", "sess1");
			await next();
		});
		app.route("/", appRoutes);
	});

	it("adds stamp and returns updated grid on success", async () => {
		// Arrange
		const newStamp = {
			date: "2024-09-10",
			lectureName: "Math",
			iconUrl: "https://example.com/icons/math.png",
		};
		// Mock the domain function to return a successful Result
		(addStampForSession as Mock).mockReturnValue(
			ok({
				user: { id: "user1", username: "test" },
				stamps: [newStamp],
			}),
		);

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
		expect(addStampForSession).toHaveBeenCalledWith(
			"sess1",
			"2024-09-10",
			"math",
		);
		const text = await res.text();
		expect(text).toContain('<img src="https://example.com/icons/math.png"');
	});

	it("returns 404 when session is not found", async () => {
		// Arrange: Mock the domain function to return a failure Result with NotFoundError
		(addStampForSession as Mock).mockReturnValue(
			fail(new NotFoundError("Session not found.")),
		);

		// Act
		const res = await app.request("/calendar/stamp", {
			method: "POST",
			body: new URLSearchParams({
				date: "2024-09-10",
				lectureId: "math",
			}).toString(),
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json", // Request JSON to check the body
			},
		});

		// Assert
		expect(res.status).toBe(404);
		const json = await res.json();
		expect(json).toEqual({
			error: {
				code: "NOT_FOUND",
				message: "Session not found.",
			},
		});
	});

	it("returns 400 for invalid input via zValidator", async () => {
		// Act: Send a request with a bad date format
		const res = await app.request("/calendar/stamp", {
			method: "POST",
			body: new URLSearchParams({ date: "bad-date", lectureId: "math" }).toString(),
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
		});

		// Assert
		expect(res.status).toBe(400);
		const json = await res.json();
		expect(json.error.code).toBe("INVALID_INPUT");
		// Check for the generic message from our simplified hook
		expect(json.error.message).toBe("Invalid input provided.");
	});

	it("returns 401 when user is not authenticated", async () => {
		// Arrange: Create a new app instance without the user-setting middleware
		const noUserApp = new Hono<Env>();
		noUserApp.onError(errorHandler); // Crucially, add the error handler
		noUserApp.route("/", appRoutes);

		// Act
		const res = await noUserApp.request("/calendar/stamp", {
			method: "POST",
			body: new URLSearchParams({
				date: "2024-09-10",
				lectureId: "math",
			}).toString(),
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Accept: "application/json",
			},
		});

		// Assert
		expect(res.status).toBe(401);
		const json = await res.json();
		expect(json).toEqual({
			error: {
				code: "UNAUTHORIZED",
				message: "You must be logged in to add a stamp.",
			},
		});
	});

	// The old modal routes should still work
	describe("stamp modal routes", () => {
		it("returns modal HTML for valid date", async () => {
			const res = await app.request("/calendar/stamp-modal/2024-09-10");
			expect(res.status).toBe(200);
			const text = await res.text();
			expect(text).toContain("<dialog");
			expect(text).toContain("Math");
		});

		it("returns 401 when user missing for modal route", async () => {
			const noUserApp = new Hono<Env>();
			noUserApp.route("/", appRoutes);
			const res = await noUserApp.request("/calendar/stamp-modal/2024-09-10");
			expect(res.status).toBe(401);
		});
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
