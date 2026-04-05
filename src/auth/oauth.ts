import { Hono } from "hono";
import { createAuthCode, verifyAuthCode, createAccessToken } from "./tokens.js";

const oauth = new Hono();

// OAuth metadata endpoint - tells Claude where to find auth endpoints
oauth.get("/.well-known/oauth-authorization-server", (c) => {
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

// Dynamic Client Registration endpoint (RFC 7591)
// Claude.ai calls this to register itself as an OAuth client
oauth.post("/register", async (c) => {
  const body = await c.req.json();
  const baseUrl = new URL(c.req.url).origin;

  // For a personal server, we return a static client_id
  // The client_secret is not really used since we do password-based auth
  const clientId = "claude-mcp-client";
  const clientSecret = "not-used-for-password-auth";

  return c.json({
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0, // Never expires
    redirect_uris: body.redirect_uris || [],
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "client_secret_post",
  });
});

// Authorization endpoint - shows login form or processes login
oauth.get("/authorize", async (c) => {
  const clientId = c.req.query("client_id");
  const redirectUri = c.req.query("redirect_uri");
  const state = c.req.query("state");
  const codeChallenge = c.req.query("code_challenge");
  const codeChallengeMethod = c.req.query("code_challenge_method");

  if (!redirectUri || !codeChallenge) {
    return c.text("Missing required parameters", 400);
  }

  if (codeChallengeMethod !== "S256") {
    return c.text("Only S256 code challenge method is supported", 400);
  }

  // Render a simple login form
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Lunch Money MCP - Login</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 400px;
          width: 100%;
        }
        h1 { margin-top: 0; color: #333; }
        input[type="password"] {
          width: 100%;
          padding: 0.75rem;
          margin: 1rem 0;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
          box-sizing: border-box;
        }
        button {
          width: 100%;
          padding: 0.75rem;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 1rem;
          cursor: pointer;
        }
        button:hover { background: #45a049; }
        .error { color: #d32f2f; margin-top: 1rem; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Lunch Money MCP</h1>
        <p>Enter your password to authorize Claude to access your Lunch Money data (read-only).</p>
        <form method="POST" action="/authorize">
          <input type="hidden" name="client_id" value="${clientId || ""}">
          <input type="hidden" name="redirect_uri" value="${redirectUri}">
          <input type="hidden" name="state" value="${state || ""}">
          <input type="hidden" name="code_challenge" value="${codeChallenge}">
          <input type="password" name="password" placeholder="Password" required autofocus>
          <button type="submit">Authorize</button>
        </form>
      </div>
    </body>
    </html>
  `;

  return c.html(html);
});

// Process login form submission
oauth.post("/authorize", async (c) => {
  const body = await c.req.parseBody();
  const password = body.password as string;
  const redirectUri = body.redirect_uri as string;
  const state = body.state as string;
  const codeChallenge = body.code_challenge as string;

  const expectedPassword = process.env.OAUTH_PASSWORD?.trim();
  if (!expectedPassword) {
    return c.text("Server misconfigured: OAUTH_PASSWORD not set", 500);
  }

  if (password.trim() !== expectedPassword) {
    // Re-render form with error
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lunch Money MCP - Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 100%;
          }
          h1 { margin-top: 0; color: #333; }
          input[type="password"] {
            width: 100%;
            padding: 0.75rem;
            margin: 1rem 0;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
            box-sizing: border-box;
          }
          button {
            width: 100%;
            padding: 0.75rem;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
          }
          button:hover { background: #45a049; }
          .error { color: #d32f2f; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Lunch Money MCP</h1>
          <p>Enter your password to authorize Claude to access your Lunch Money data (read-only).</p>
          <form method="POST" action="/authorize">
            <input type="hidden" name="redirect_uri" value="${redirectUri}">
            <input type="hidden" name="state" value="${state || ""}">
            <input type="hidden" name="code_challenge" value="${codeChallenge}">
            <input type="password" name="password" placeholder="Password" required autofocus>
            <button type="submit">Authorize</button>
          </form>
          <p class="error">Incorrect password. Please try again.</p>
        </div>
      </body>
      </html>
    `;
    return c.html(html, 401);
  }

  // Password correct - generate auth code and redirect
  const authCode = createAuthCode(codeChallenge);
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", authCode);
  if (state) {
    redirectUrl.searchParams.set("state", state);
  }

  return c.redirect(redirectUrl.toString());
});

// Token endpoint - exchange auth code for access token
oauth.post("/token", async (c) => {
  const body = await c.req.parseBody();
  const grantType = body.grant_type as string;
  const code = body.code as string;
  const codeVerifier = body.code_verifier as string;

  // Debug logging - remove after fixing
  console.log("Token request:", {
    grantType,
    hasCode: !!code,
    codeLength: code?.length,
    hasCodeVerifier: !!codeVerifier,
    codeVerifierLength: codeVerifier?.length,
  });

  if (grantType !== "authorization_code") {
    console.log("Error: unsupported_grant_type", grantType);
    return c.json({ error: "unsupported_grant_type" }, 400);
  }

  if (!code || !codeVerifier) {
    console.log("Error: invalid_request - missing code or verifier");
    return c.json({ error: "invalid_request" }, 400);
  }

  const verifyResult = verifyAuthCode(code, codeVerifier);
  console.log("Verify result:", verifyResult);

  if (!verifyResult) {
    console.log("Error: invalid_grant - code verification failed");
    return c.json({ error: "invalid_grant" }, 400);
  }

  const accessToken = createAccessToken();

  return c.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 90 * 24 * 60 * 60, // 90 days in seconds
  });
});

export default oauth;
