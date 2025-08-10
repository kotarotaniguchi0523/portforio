/* biome-ignore lint/nursery/noUnresolvedImports: Playwright provides these */
import { test, expect } from "@playwright/test";

test("has title and login button", async ({ page }) => {
	// Navigate to the root URL, which should show the login page
	await page.goto("/");

	// Expect the h1 element to have the text "スタンプカレンダー".
	await expect(page.locator("h1")).toHaveText("スタンプカレンダー");

	// Find the login link by its class and text content.
	const loginLink = page.locator("a.line-login-btn");

	// Expect the link to have the correct text and be visible.
	await expect(loginLink).toHaveText("LINEでログイン");
	await expect(loginLink).toBeVisible();
});
