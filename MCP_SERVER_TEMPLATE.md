# Building Remote MCP Servers for Claude.ai

A comprehensive guide for building remote MCP (Model Context Protocol) servers that integrate with Claude.ai, hosted on Vercel. Based on lessons learned building the Lunch Money MCP server.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Required Endpoints](#required-endpoints)
3. [OAuth 2.1 Implementation](#oauth-21-implementation)
4. [MCP Protocol Requirements](#mcp-protocol-requirements)
5. [Vercel Configuration](#vercel-configuration)
6. [Common Gotchas](#common-gotchas)
7. [Quick Start Checklist](#quick-start-checklist)
8. [File Structure Template](#file-structure-template)

---

## Architecture Overview

```
┌─────────────┐    JSON-RPC     ┌──────────────────┐      REST API      ┌─────────────┐
│  Claude.ai  │ ◄─────────────► │  Your MCP Server │ ◄────────────────► │ External API│
└─────────────┘                 │    (Vercel)      │                    └─────────────┘
                                └──────────────────┘
```

**Key Components:**
- **OAuth 2.1 + PKCE**: Claude.ai authenticates via OAuth before making MCP requests
- **JSON-RPC**: MCP uses JSON-RPC 2.0 for all communication
- **Stateless Tokens**: Use HMAC-signed tokens (no database needed)

---

## Required Endpoints

Claude.ai expects these endpoints to exist:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.well-known/oauth-authorization-server` | GET | OAuth metadata discovery |
| `/register` | POST | Dynamic Client Registration (RFC 7591) |
| `/authorize` | GET | Show login form |
| `/authorize` | POST | Process login, redirect with auth code |
| `/token` | POST | Exchange auth code for access token |
| `/` | POST | **MCP endpoint** (Claude sends JSON-RPC here) |

**Critical**: The MCP endpoint MUST be at the root path `/`. Claude.ai POSTs JSON-RPC requests to your server's root URL.

---

## OAuth 2.1 Implementation

### 1. OAuth Metadata (/.well-known/oauth-authorization-server)

```typescript
app.get("/.well-known/oauth-authorization-server", (c) => {
  const baseUrl = new URL(c.req.url).origin;
  return c.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
  });
});
```

### 2. Dynamic Client Registration (/register)

Claude.ai calls this to register itself as an OAuth client:

```typescript
app.post("/register", async (c) => {
  const body = await c.req.json();
  
  // For personal servers, return static credentials
  return c.json({
    client_id: "claude-mcp-client",
    client_secret: "not-used-for-password-auth",
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0,
    redirect_uris: body.redirect_uris || [],
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
  });
});
```

### 3. Authorization Flow

**GET /authorize** - Show login form with hidden fields:
- `redirect_uri` - Where to redirect after login
- `state` - CSRF protection (pass back unchanged)
- `code_challenge` - PKCE challenge from Claude

**POST /authorize** - Validate password, generate auth code, redirect:
```typescript
const authCode = createAuthCode(codeChallenge);
const redirectUrl = new URL(redirectUri);
redirectUrl.searchParams.set("code", authCode);
redirectUrl.searchParams.set("state", state);
return c.redirect(redirectUrl.toString());
```

### 4. Token Exchange (/token)

```typescript
app.post("/token", async (c) => {
  const body = await c.req.parseBody();
  const code = body.code as string;
  const codeVerifier = body.code_verifier as string;

  if (!verifyAuthCode(code, codeVerifier)) {
    return c.json({ error: "invalid_grant" }, 400);
  }

  return c.json({
    access_token: createAccessToken(),
    token_type: "Bearer",
    expires_in: 90 * 24 * 60 * 60, // 90 days
  });
});
```

### 5. PKCE Verification (Critical!)

PKCE MUST use standard SHA-256, NOT HMAC:

```typescript
import { createHash } from "crypto";

function verifyPKCE(codeChallenge: string, codeVerifier: string): boolean {
  // SHA-256 hash of verifier should equal the stored challenge
  const computed = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  
  return codeChallenge === computed;
}
```

**Wrong** (we made this mistake):
```typescript
// DON'T DO THIS - HMAC is not standard PKCE
createHmac("sha256", "pkce").update(codeVerifier).digest("base64url");
```

### 6. Stateless Token Signing

Use HMAC to sign tokens (no database needed):

```typescript
import { createHmac } from "crypto";

function sign(payload: object): string {
  const data = JSON.stringify(payload);
  const signature = createHmac("sha256", process.env.TOKEN_SECRET!)
    .update(data)
    .digest("base64url");
  const encodedData = Buffer.from(data).toString("base64url");
  return `${encodedData}.${signature}`;
}

function verify(token: string): object | null {
  const [encodedData, signature] = token.split(".");
  const data = Buffer.from(encodedData, "base64url").toString();
  const expected = createHmac("sha256", process.env.TOKEN_SECRET!)
    .update(data)
    .digest("base64url");
  
  if (signature !== expected) return null;
  
  const payload = JSON.parse(data);
  if (payload.exp < Date.now()) return null;
  
  return payload;
}
```

---

## MCP Protocol Requirements

### Methods That Don't Require Auth

These methods are called BEFORE OAuth completes:

```typescript
const publicMethods = ["initialize", "notifications/initialized"];
```

Your MCP endpoint must allow these without a Bearer token!

### Initialize Response

```typescript
case "initialize":
  return {
    jsonrpc: "2.0",
    id,
    result: {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "your-mcp-server", version: "1.0.0" },
      capabilities: { tools: {} },
    },
  };
```

### Tools List Response

```typescript
case "tools/list":
  return {
    jsonrpc: "2.0",
    id,
    result: { tools: toolDefinitions },
  };
```

### Tool Call Response

```typescript
case "tools/call":
  const result = await toolHandlers[toolName](args);
  return {
    jsonrpc: "2.0",
    id,
    result: {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    },
  };
```

### Tool Definition Schema

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, PropertySchema>;
    required?: string[];
  };
}
```

---

## Vercel Configuration

### vercel.json

```json
{
  "cleanUrls": false,
  "trailingSlash": false,
  "rewrites": [
    {
      "source": "/.well-known/oauth-authorization-server",
      "destination": "/api"
    },
    {
      "source": "/:path*",
      "destination": "/api/:path*"
    }
  ]
}
```

**Important**: The `.well-known` rewrite is required! Vercel may not route dotfiles correctly by default.

### api/[[...route]].ts (Catch-all)

```typescript
import { handle } from "hono/vercel";
import app from "../src/index.js";

export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);
```

### package.json

```json
{
  "type": "module",
  "scripts": {
    "start": "vercel dev",
    "build": "tsc"
  }
}
```

**Note**: Don't name the script `"dev"` — it causes recursive invocation with `vercel dev`.

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],  // Required for process, Buffer, crypto
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

---

## Common Gotchas

### 1. "Couldn't reach the MCP server"
- **Cause**: `/register` endpoint missing
- **Fix**: Add Dynamic Client Registration endpoint

### 2. "Authorization failed" after entering password
- **Cause**: PKCE using HMAC instead of SHA-256
- **Fix**: Use `createHash("sha256")` not `createHmac("sha256", key)`

### 3. POST to `/` returns 404
- **Cause**: MCP endpoint at `/mcp` instead of `/`
- **Fix**: Add `app.post("/", handleMcp)` 

### 4. "Incorrect password" but password is correct
- **Cause**: Extra whitespace/newlines in Vercel env vars
- **Fix**: Delete and re-enter env vars, ensure no trailing spaces

### 5. `initialize` method fails with 401
- **Cause**: Auth required for all methods
- **Fix**: Allow `initialize` and `notifications/initialized` without auth

### 6. /.well-known returns 404 on Vercel
- **Cause**: Vercel doesn't route dotfiles by default
- **Fix**: Add explicit rewrite in vercel.json

### 7. "Cannot find name 'process'" build error
- **Cause**: Missing Node.js types
- **Fix**: Add `"types": ["node"]` to tsconfig.json

### 8. Env vars not loading in Vercel
- **Cause**: Vars not enabled for Production environment
- **Fix**: Edit each var, check "Production", redeploy

---

## Quick Start Checklist

### Before Coding
- [ ] Get API credentials for your target service
- [ ] Plan your tools (read-only first, write later)

### Implementation
- [ ] Set up Hono with CORS enabled
- [ ] Implement `/.well-known/oauth-authorization-server`
- [ ] Implement `/register` endpoint
- [ ] Implement `/authorize` (GET + POST)
- [ ] Implement `/token` with PKCE (SHA-256!)
- [ ] Implement MCP endpoint at `/` (root path)
- [ ] Allow `initialize` without auth
- [ ] Implement `tools/list` and `tools/call`

### Vercel Setup
- [ ] Add `.well-known` rewrite to vercel.json
- [ ] Set environment variables (Production!)
- [ ] Verify no whitespace in env var values
- [ ] Deploy and test endpoints with curl

### Claude.ai Integration
- [ ] Go to Settings → Connectors
- [ ] Add your Vercel URL (no trailing slash)
- [ ] Complete OAuth login
- [ ] Test with a simple prompt

---

## File Structure Template

```
your-mcp-server/
├── api/
│   └── [[...route]].ts       # Vercel entry point
├── src/
│   ├── index.ts              # Hono app, routes, MCP endpoint
│   ├── auth/
│   │   ├── oauth.ts          # OAuth endpoints
│   │   └── tokens.ts         # Token signing/verification
│   ├── services/
│   │   └── your-api.ts       # External API client
│   └── mcp/
│       ├── handler.ts        # JSON-RPC dispatcher
│       ├── types.ts          # MCP types
│       └── tools/
│           ├── index.ts      # Tool registry
│           └── [tools].ts    # Individual tool handlers
├── vercel.json
├── tsconfig.json
├── package.json
└── .env.local                # Local env vars (not committed)
```

---

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `OAUTH_PASSWORD` | Password for OAuth login | `your-secure-password` |
| `TOKEN_SECRET` | HMAC key for signing tokens | `openssl rand -base64 32` |
| `YOUR_API_KEY` | Credentials for external API | `abc123...` |

---

## Testing Commands

```bash
# Test OAuth metadata
curl https://your-server.vercel.app/.well-known/oauth-authorization-server

# Test client registration
curl -X POST https://your-server.vercel.app/register \
  -H "Content-Type: application/json" \
  -d '{"redirect_uris":["https://claude.ai/callback"]}'

# Test MCP initialize (no auth required)
curl -X POST https://your-server.vercel.app/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# Test tools/list (requires auth)
curl -X POST https://your-server.vercel.app/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Claude.ai Custom Connectors](https://support.anthropic.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers)
- [OAuth 2.1 with PKCE](https://oauth.net/2.1/)
- [RFC 7591 - Dynamic Client Registration](https://datatracker.ietf.org/doc/html/rfc7591)
- [Hono Framework](https://hono.dev/)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)

---

*Created after successfully building the Lunch Money MCP server. May this guide save you hours of debugging!*
