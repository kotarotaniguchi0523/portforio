import "dotenv/config";
import { Hono } from "hono";
import type { Env } from "./types.ts";
import { serve } from "@hono/node-server";
import { env } from "std-env";
import { seedLectures } from "./db/index.ts";
import { renderer } from "./web/components/Layout.tsx";
import { sessionMiddleware } from "./web/middleware/session.ts";
import { appRoutes } from "./web/routes.tsx";

// Seed the database with initial data
try {
	seedLectures();
} catch (error) {
	console.error("Failed to seed database. Exiting.", error);
	process.exit(1);
}

const app = new Hono<Env>();

// Register middleware
app.use(renderer);
app.use(sessionMiddleware);

// Register routes
app.route("/", appRoutes);

const PORT = Number(env.PORT) || 3000;
console.log(`Server is running on http://localhost:${PORT}`);

serve({
	fetch: app.fetch,
	port: PORT,
});
