# Lunch Money MCP Server

A remote MCP (Model Context Protocol) server that wraps the [Lunch Money](https://lunchmoney.app) personal finance API. Deploys to Vercel and connects to Claude.ai as a remote integration.

## What It Does

Enables Claude to query your Lunch Money data — transactions, budgets, categories, accounts, and more — through natural conversation.

## How It Works

```
Claude.ai → MCP Protocol → This Server (Vercel) → Lunch Money API
```

1. Claude sends a JSON-RPC request to the `/mcp` endpoint
2. The server validates the auth token and routes to the appropriate tool
3. The tool calls the Lunch Money API and returns formatted results
4. Claude interprets the data and responds in natural language

## Use Cases

- "What did I spend on groceries last month?"
- "Show me my recurring expenses"
- "How's my dining out budget looking?"
- "List my recent transactions over $100"

## Security

This server uses **OAuth 2.1** for authentication with Claude.ai.

### Authentication Flow

When you add this server as a custom connector in Claude.ai:

```
1. You enter your MCP server URL in Claude.ai settings
                    ↓
2. Claude discovers the OAuth endpoints via /.well-known/oauth-authorization-server
                    ↓
3. Claude redirects your browser to the /authorize login page
                    ↓
4. You enter your password (the OAUTH_PASSWORD you configured)
                    ↓
5. Server validates password and generates a signed access token
                    ↓
6. Server redirects back to Claude with the token
                    ↓
7. Claude stores the token and uses it for all future MCP requests
```

**After initial setup:** Claude automatically includes the token with every request. No further login needed until the token expires.

### Token Expiration

- **Access tokens expire after 3 months (90 days)**
- When expired, Claude will redirect you to the login page again
- You'll need to re-enter your password once every 3 months

### Current: Minimal OAuth (Read-Only)

For read-only operations, we use a simplified OAuth implementation:
- Single-user password authentication
- 3-month token expiry (no database required — tokens are self-validating)
- PKCE validation (required by MCP spec)

This is appropriate for personal use with read-only financial queries.

### Future: Full OAuth (If Write Operations Added)

If write operations are added (update transactions, create budgets, etc.), upgrade to full OAuth:
- Short-lived access tokens (15 min - 1 hour)
- Refresh token rotation
- Token revocation endpoint
- Persistent token storage (Vercel KV or Redis)

**Guideline:** Read-only = minimal auth is acceptable. Write operations = upgrade to full OAuth.

### Emergency: Revoke All Access

If you need to immediately invalidate all tokens (e.g., suspected compromise):
1. Change the `TOKEN_SECRET` environment variable in Vercel
2. All existing tokens become invalid instantly
3. You'll need to re-authenticate in Claude.ai

### Managing Your Password

Your OAuth password is stored as an environment variable in Vercel. Here's how to manage it:

**View/Change Password:**
1. Go to [vercel.com](https://vercel.com) → your `lunchmoney-mcp` project
2. Click **Settings** → **Environment Variables**
3. Find `OAUTH_PASSWORD` — click to view or edit
4. After changing, click **Save**
5. Go to **Deployments** → click the 3-dot menu on the latest → **Redeploy**
6. Next time you connect from Claude, use the new password

**Troubleshooting Password Issues:**
- Ensure there are no extra spaces or line breaks in the value
- Verify the variable is enabled for **Production** environment
- After any change, you must **redeploy** for it to take effect

**Generate a Strong Password:**
```bash
openssl rand -base64 16
```

## Setup

1. Get your Lunch Money API token from [my.lunchmoney.app/developers](https://my.lunchmoney.app/developers)
2. Deploy to Vercel and set environment variables:
   - `LUNCHMONEY_API_TOKEN` — Your Lunch Money API key
   - `OAUTH_PASSWORD` — Password for OAuth login
   - `TOKEN_SECRET` — Secret key for signing tokens (generate a random string)
3. Add as a remote MCP integration in Claude.ai:
   - Go to Settings → Connectors → Add custom connector
   - Enter your Vercel deployment URL
   - Complete the OAuth login when prompted

## Project Structure

```
lunchmoney-mcp/
├── api/                          # Vercel serverless entry point
│   └── [[...route]].ts           # Catch-all route → delegates to Hono
│
├── src/
│   ├── index.ts                  # Hono app: routes, middleware, MCP endpoint
│   ├── auth/
│   │   ├── oauth.ts              # OAuth endpoints (/authorize, /token, etc.)
│   │   └── tokens.ts             # Token creation & validation (HMAC-signed)
│   ├── services/
│   │   └── lunchmoney.ts         # Lunch Money API client
│   └── mcp/                      # (planned) MCP tools
│       ├── handler.ts            # JSON-RPC router
│       └── tools/                # Tool implementations
│
├── vercel.json                   # Vercel route rewrites
├── tsconfig.json                 # TypeScript config
└── .env.local                    # Environment variables (not committed)
```

## Available Tools (Planned)

| Tool | Description |
|------|-------------|
| `get_user` | Get account info |
| `get_transactions` | Query transactions by date range, category, account |
| `get_categories` | List spending categories |
| `get_budgets` | Get budget data for a date range |
| `get_recurring_items` | List recurring expenses |
| `get_plaid_accounts` | List linked bank accounts |
| `get_assets` | List manual assets |
| `get_tags` | List transaction tags |

## Tech Stack

- **Runtime:** Hono on Vercel serverless
- **API:** Lunch Money v1
- **Protocol:** MCP via raw JSON-RPC (no SDK)
- **Auth:** OAuth 2.1 with PKCE

## Environment Variables

| Variable | Description |
|----------|-------------|
| `LUNCHMONEY_API_TOKEN` | Your Lunch Money API key ([get it here](https://my.lunchmoney.app/developers)) |
| `OAUTH_PASSWORD` | Password for OAuth login |
| `TOKEN_SECRET` | Secret key for signing tokens (use `openssl rand -base64 32`) |

## Development

```bash
# Install dependencies
npm install

# Run locally with Vercel dev server
npm run dev

# The server will be available at http://localhost:3000
```

## License

MIT
