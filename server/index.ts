import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import app from "./app.js";

// In production (Docker/Dokku), serve the Vite-built SPA.
// Vercel handles static files via vercel.json — this path is Node.js only.
if (process.env.NODE_ENV === "production") {
  app.use("*", serveStatic({ root: "./dist" }));
  app.get("*", serveStatic({ path: "./dist/index.html" }));
}

const port = parseInt(process.env.PORT ?? "3001", 10);
console.log(`Hono server listening on http://localhost:${port}`);
serve({ fetch: app.fetch, port });
