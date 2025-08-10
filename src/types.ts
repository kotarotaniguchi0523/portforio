import type { Hono } from "hono";

declare module "hono" {
	interface ContextRenderer {
		(content: string | Promise<string>, props: { title: string }): Response;
	}
}

type SessionData = {
	user: { id: string; username: string };
	stamps: { date: string; lectureType: string }[];
};

export type Env = {
	Variables: {
		user: SessionData["user"] | undefined;
		stamps: SessionData["stamps"] | undefined;
		sessionId: string | undefined;
	};
};

export type AppType = Hono<Env>;
