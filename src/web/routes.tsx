import { Hono } from "hono";
import type { Env } from "../types.ts";
import { setCookie, getCookie } from "hono/cookie";
import { env } from "std-env";
import { nanoid } from "nanoid";
import { LoginPage } from "./components/LoginPage.tsx";
import { CalendarPage, CalendarGrid } from "./components/CalendarPage.tsx";
import { ErrorPage } from "./components/ErrorPage.tsx";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
// Domain imports
import {
	addStampForSession,
	findOrCreateUser,
	createSession,
	deleteSession,
} from "../domain/session.ts";
import { getAvailableLectures } from "../domain/lectures.ts";
import { getCurrentMonth, getMonthDates } from "../domain/calendar.ts";
import { stampInputSchema } from "../db/schema.ts";
import { UnauthorizedError, ValidationError } from "../lib/result.ts";

export const appRoutes = new Hono<Env>();

/**
 * GET /calendar/stamp-modal/:date
 * Fetches and returns the HTML for a modal dialog that allows a user to
 * select a lecture and stamp a specific date.
 * Triggered by htmx when a user clicks on a calendar date.
 */
appRoutes.get("/calendar/stamp-modal/:date", (c) => {
	const user = c.get("user");
	if (!user) {
		return c.body(null, 401);
	}
	const parsed = z
		.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
		.safeParse(c.req.param());
	if (!parsed.success) {
		return c.text("Invalid date format", 400);
	}
	const { date } = parsed.data;
	const lectures = getAvailableLectures();

	// Use a <dialog> element for the modal. HTMX will place this in the DOM.
	return c.html(
		<dialog
			open
			class="max-w-md rounded-lg shadow-lg [&::backdrop]:bg-black/50"
		>
			<div class="p-5 text-center">
				<p>
					<strong>{date}</strong>
				</p>
				<p>Which lecture stamp would you like to add?</p>
				<form
					hx-post="/calendar/stamp"
					hx-target="#calendar-grid"
					hx-swap="outerHTML"
				>
					<input type="hidden" name="date" value={date} />
					<select
						name="lectureId"
						class="mb-4 w-full rounded border border-gray-300 p-2"
					>
						{lectures.map((lecture) => (
							<option value={lecture.id}>{lecture.name}</option>
						))}
					</select>
					<div class="mt-5 flex justify-end gap-2">
						<button
							type="submit"
							class="rounded bg-brand-blue px-3 py-2 text-white"
						>
							Stamp
						</button>
						<button
							type="button"
							class="rounded bg-[#ccc] px-3 py-2 text-black"
							onclick="this.closest('dialog').close()"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		</dialog>,
	);
});

/**
 * POST /calendar/stamp
 * Handles the form submission from the stamp modal. It records the new stamp
 * in the database and returns the re-rendered calendar grid HTML to be
 * swapped in by htmx.
 * This route is refactored to use the global error handler.
 */
appRoutes.post(
	"/calendar/stamp",
	zValidator("form", stampInputSchema, (result, _c) => {
		if (!result.success) {
			// If validation fails, just throw a generic validation error.
			// The exact error message from Zod seems to be problematic in the test env.
			throw new ValidationError("Invalid input provided.");
		}
	}),
	async (c) => {
		const user = c.get("user");
		const sessionId = c.get("sessionId");
		if (!user || !sessionId) {
			// Throw an error that the global handler will catch and convert to a 401 response
			throw new UnauthorizedError("You must be logged in to add a stamp.");
		}

		// The form data is already validated by zValidator and is available via c.req.valid()
		const { date, lectureId } = c.req.valid("form");

		// Call the domain logic which returns a Result type
		const result = addStampForSession(sessionId, date, lectureId);

		// Handle the result: throw the error on failure, use the data on success
		if (!result.success) {
			throw result.error;
		}
		const sessionData = result.data;

		// Re-render the calendar grid for the month of the stamped date
		const targetDate = new Date(date);
		const dates = getMonthDates(targetDate.getFullYear(), targetDate.getMonth());
		const newGrid = <CalendarGrid dates={dates} stamps={sessionData.stamps} />;

		// Return only the updated grid.
		return c.html(newGrid);
	},
);

/**
 * GET /
 * The root route. If the user is logged in, it redirects to the calendar.
 * Otherwise, it displays the login page.
 */
appRoutes.get("/", (c) => {
	const user = c.get("user");
	if (user) {
		return c.redirect("/calendar");
	}
	return c.render(<LoginPage />, { title: "ログイン" });
});

/**
 * GET /calendar
 * Displays the main calendar page for a logged-in user.
 * Redirects to the login page if the user is not authenticated.
 */
appRoutes.get("/calendar", (c) => {
        const user = c.get("user");
        const stamps = c.get("stamps") ?? []; // Get stamps from context
        if (!user) {
                return c.redirect("/");
        }
        const { dates, year, month } = getCurrentMonth();
        return c.render(
                <CalendarPage
                        username={user.username}
                        stamps={stamps}
                        dates={dates}
                        year={year}
                        month={month}
                />,
                {
                        title: "スタンプカレンダー",
                },
        );
});

/**
 * GET /logout
 * Logs the user out by deleting their session cookie and data,
 * then redirects to the login page.
 */
appRoutes.get("/logout", (c) => {
	const sessionId = getCookie(c, "sessionId");
	if (sessionId) {
		deleteSession(sessionId);
		setCookie(c, "sessionId", "", { expires: new Date(0), path: "/" });
	}
	return c.redirect("/");
});

// === LINE Login Routes ===

/**
 * GET /login/line
 * Step 1 of the LINE Login flow.
 * Generates a state for CSRF protection, stores it in a cookie,
 * and redirects the user to LINE's authentication page.
 */
appRoutes.get("/login/line", (c) => {
	if (!env.LINE_CHANNEL_ID || !env.LINE_CALLBACK_URL) {
		console.error("LINE environment variables are not set.");
		// biome-ignore lint/nursery/noSecrets: 'Configuration error' is not a secret.
		return c.text("Configuration error", 500);
	}
	const state = nanoid(32);
	setCookie(c, "line_state", state, {
		path: "/",
		httpOnly: true,
		secure: c.req.url.startsWith("https://"),
		sameSite: "Lax",
	});

	const params = new URLSearchParams({
		response_type: "code",
		client_id: env.LINE_CHANNEL_ID,
		redirect_uri: env.LINE_CALLBACK_URL,
		state,
		scope: "profile openid",
	});
	const url = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;

	return c.redirect(url);
});

/**
 * GET /auth/line/callback
 * Step 2 of the LINE Login flow.
 * Handles the callback from LINE after the user authenticates. It validates
 * the state to prevent CSRF, exchanges the authorization code for an access
 * token, fetches the user's profile, finds or creates a user in the local
 * database, creates a new session, and redirects to the calendar page.
 */
appRoutes.get("/auth/line/callback", async (c) => {
	const queryResult = z
		.object({ code: z.string(), state: z.string() })
		.safeParse(c.req.query());
	if (!queryResult.success) {
		return c.text("Invalid query", 400);
	}
	const { code, state } = queryResult.data;
	const storedState = getCookie(c, "line_state");

	// Delete the state cookie immediately after use to prevent reuse.
	setCookie(c, "line_state", "", { expires: new Date(0), path: "/" });

	if (!storedState || state !== storedState) {
		return c.text(
			"State mismatch or cookie missing. CSRF attack detected.",
			400,
		);
	}

	if (
		!env.LINE_CALLBACK_URL ||
		!env.LINE_CHANNEL_ID ||
		!env.LINE_CHANNEL_SECRET
	) {
		console.error("LINE environment variables are not set.");
		// biome-ignore lint/nursery/noSecrets: 'Configuration error' is not a secret.
		return c.text("Configuration error", 500);
	}

	try {
		// Exchange authorization code for access token
		const tokenUrl = "https://api.line.me/oauth2/v2.1/token";
		const tokenParams = new URLSearchParams();
		tokenParams.append("grant_type", "authorization_code");
		tokenParams.append("code", code);
		tokenParams.append("redirect_uri", env.LINE_CALLBACK_URL);
		tokenParams.append("client_id", env.LINE_CHANNEL_ID);
		tokenParams.append("client_secret", env.LINE_CHANNEL_SECRET);

		const tokenRes = await fetch(tokenUrl, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: tokenParams,
		});

		if (!tokenRes.ok) {
			const errorBody = await tokenRes.text();
			throw new Error(`Failed to issue token: ${tokenRes.status} ${errorBody}`);
		}
		const tokenData = z
			.object({ access_token: z.string() })
			.parse(await tokenRes.json());
		const accessToken = tokenData.access_token;

		// Get user profile using the access token
		const profileUrl = "https://api.line.me/v2/profile";
		const profileRes = await fetch(profileUrl, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!profileRes.ok) {
			const errorBody = await profileRes.text();
			throw new Error(
				`Failed to get profile: ${profileRes.status} ${errorBody}`,
			);
		}
		const profile = z
			.object({ userId: z.string(), displayName: z.string() })
			.parse(await profileRes.json());

		// Find or create user in our database
		const user = findOrCreateUser(profile.userId, profile.displayName);

		// Create a new session for the user
		const sessionId = createSession(user.id);
		setCookie(c, "sessionId", sessionId, {
			path: "/",
			httpOnly: true,
			secure: c.req.url.startsWith("https://"),
			sameSite: "Lax",
		});

		// Redirect to the calendar page
		return c.redirect("/calendar");
	} catch (error) {
		console.error("LINE Login Error:", error);
		return c.render(
			<ErrorPage
				errorTitle="ログインエラー"
				errorMessage="LINEでのログインに失敗しました。時間をおいて再度お試しください。"
			/>,
			{
				title: "エラー",
			},
		);
	}
});
