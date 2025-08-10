import "dotenv/config";
import { Hono } from "hono";
import type { Env } from "./types.ts";
import { serve } from "@hono/node-server";
import { env } from "std-env";
import { renderer } from "./web/components/Layout.tsx";
import { sessionMiddleware } from "./web/middleware/session.ts";
import { appRoutes } from "./web/routes.tsx";
import { seedLectures, startSessionCleanup } from "./db/index.ts";

const app = new Hono<Env>();

// Register middleware
app.use(renderer);
app.use(sessionMiddleware);

// Register routes
app.route("/", appRoutes);

// Initialize infrastructure side effects explicitly
seedLectures();
startSessionCleanup();

const PORT = Number(env.PORT) || 3000;
console.log(`Server is running on http://localhost:${PORT}`);

serve({
	fetch: app.fetch,
	port: PORT,
});
