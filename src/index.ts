import { Hono } from "hono";
import { cors } from "hono/cors";
import oauth from "./auth/oauth.js";
import { verifyAccessToken } from "./auth/tokens.js";
import { handleMcpRequest } from "./mcp/handler.js";
import type { JsonRpcRequest } from "./mcp/types.js";

const app = new Hono();

// Enable CORS for Claude.ai requests
app.use("*", cors());

// Mount OAuth routes
app.route("/", oauth);

// Health check
app.get("/", (c) => {
  return c.json({ status: "ok", service: "lunchmoney-mcp" });
});

// Auth middleware for MCP endpoint
app.use("/mcp", async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!verifyAccessToken(token)) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  await next();
});

// MCP endpoint - accepts JSON-RPC requests
app.post("/mcp", async (c) => {
  const body = (await c.req.json()) as JsonRpcRequest;
  const response = await handleMcpRequest(body);
  return c.json(response);
});

export default app;
