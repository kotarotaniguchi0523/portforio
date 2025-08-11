import "dotenv/config";
import { Hono } from "hono";
import type { Env } from "./types.ts";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { env } from "std-env";
// biome-ignore lint/nursery/noUnresolvedImports: Node.js builtin
import process from "node:process";
import { renderer } from "./web/components/Layout.tsx";
import { sessionMiddleware } from "./web/middleware/session.ts";
import { errorHandler } from "./web/middleware/errorHandler.tsx";
import { appRoutes } from "./web/routes.tsx";
import { seedLectures, startSessionCleanup } from "./db/index.ts";

const app = new Hono<Env>();

// Register middleware
app.use(renderer);
app.use(sessionMiddleware);
app.use("/static/*", serveStatic({ root: "./public" }));

// Register global error handler
app.onError(errorHandler);

// Register routes
app.route("/", appRoutes);

// Initialize infrastructure side effects explicitly
try {
    seedLectures();
} catch (error) {
    console.error("Failed to seed lectures:", error);
    process.exit(1);
}
startSessionCleanup();

const PORT = Number(env.PORT) || 3000;
console.log(`Server is running on http://localhost:${PORT}`);

serve({
	fetch: app.fetch,
	port: PORT,
});
