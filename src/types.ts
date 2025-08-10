import type { Hono } from "hono";
import type { SessionData } from "./domain/types.ts";

declare module "hono" {
        interface ContextRenderer {
                (content: string | Promise<string>, props: { title: string }): Response;
        }
}

export type Env = {
	Variables: {
		user: SessionData["user"] | undefined;
		stamps: SessionData["stamps"] | undefined;
		sessionId: string | undefined;
	};
};

export type AppType = Hono<Env>;
