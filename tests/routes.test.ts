import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { Hono } from "hono";
import type { Env } from "../src/types.ts";

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
         // Arrange: Configure the mock to return a new stamp after stamping.
		const newStamp = {
			date: "2024-09-10",
			lectureName: "Math",
			iconUrl: "https://example.com/icons/math.png",
		};
                  (addStampForSession as Mock).mockReturnValue({
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
                  expect(addStampForSession).toHaveBeenCalledWith(
                          "sess1",
                          "2024-09-10",
                          "math",
                  );

		// Now, the important check: does the returned grid contain the stamp as an image?
                expect(text).toContain('cursor-default');
		expect(text).toContain('<img src="https://example.com/icons/math.png"');
		expect(text).toContain('alt="Math"');
	});

    it("returns calendar grid for the month of the stamped date, not the current month", async () => {
        // Arrange: Mock that we are stamping a date in October.
        // The default mock for getCurrentMonth() returns September.
        const octoberStamp = {
            date: "2024-10-15",
            lectureName: "Science",
            iconUrl: "https://example.com/icons/science.png",
        };
        (addStampForSession as Mock).mockReturnValue({
            user: { id: "user1", username: "test" },
            stamps: [octoberStamp],
        });

        // Act
        const res = await app.request("/calendar/stamp", {
            method: "POST",
            body: new URLSearchParams({
                date: "2024-10-15",
                lectureId: "science",
            }).toString(),
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        // Assert
        expect(res.status).toBe(200);
        const text = await res.text();

        // September (the mocked "current" month) has 30 days.
        // October (the stamped month) has 31 days.
        // If the correct grid for October is returned, it should contain the 31st day.
        expect(text).toContain(">31</div>");
    });

         it("handles errors during stamping", async () => {
                 // Arrange: Make the stamping function throw an error
                   (addStampForSession as Mock).mockImplementation(() => {
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
