import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { getSessionData } from "../../domain/session.ts";

type SessionData = {
	user: { id: string; username: string };
	stamps: { date: string; lectureType: string }[];
};

type SessionVariables = {
	user: SessionData["user"] | undefined;
	stamps: SessionData["stamps"] | undefined;
	sessionId: string | undefined;
};

export const sessionMiddleware = createMiddleware<{
	Variables: SessionVariables;
}>(async (c, next) => {
	const sessionId = getCookie(c, "sessionId");
	if (sessionId) {
		const sessionData = getSessionData(sessionId);
		if (sessionData) {
			c.set("user", sessionData.user);
			c.set("stamps", sessionData.stamps);
			c.set("sessionId", sessionId);
		}
	}
	await next();
});
