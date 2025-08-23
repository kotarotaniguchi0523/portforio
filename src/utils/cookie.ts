import { setCookie } from "hono/cookie";
import type { Context } from "hono";
import type { CookieOptions } from "hono/utils/cookie";

/**
 * Set a cookie with security-minded defaults. The options can override defaults.
 */
export function setSecureCookie(
  c: Context,
  name: string,
  value: string,
  options: CookieOptions = {},
): void {
  setCookie(c, name, value, {
    path: "/",
    httpOnly: true,
    secure: c.req.url.startsWith("https://"),
    sameSite: "Lax",
    ...options,
  });
}
