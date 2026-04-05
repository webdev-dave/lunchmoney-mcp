import { createHmac } from "crypto";

const TOKEN_EXPIRY_DAYS = 90; // 3 months

interface TokenPayload {
  type: "auth_code" | "access_token";
  exp: number;
  codeChallenge?: string;
}

function getSecret(): string {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) {
    throw new Error("TOKEN_SECRET environment variable is required");
  }
  return secret;
}

function sign(payload: TokenPayload): string {
  const data = JSON.stringify(payload);
  const signature = createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");
  const encodedData = Buffer.from(data).toString("base64url");
  return `${encodedData}.${signature}`;
}

function verify(token: string): TokenPayload | null {
  try {
    const [encodedData, signature] = token.split(".");
    if (!encodedData || !signature) return null;

    const data = Buffer.from(encodedData, "base64url").toString();
    const expectedSignature = createHmac("sha256", getSecret())
      .update(data)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const payload: TokenPayload = JSON.parse(data);

    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export function createAuthCode(codeChallenge: string): string {
  const payload: TokenPayload = {
    type: "auth_code",
    exp: Date.now() + 10 * 60 * 1000, // 10 minutes
    codeChallenge,
  };
  return sign(payload);
}

export function verifyAuthCode(
  code: string,
  codeVerifier: string
): boolean {
  const payload = verify(code);
  if (!payload || payload.type !== "auth_code") return false;

  // Verify PKCE: hash the verifier and compare to stored challenge
  const computedChallenge = createHmac("sha256", "pkce")
    .update(codeVerifier)
    .digest("base64url")
    .replace(/=/g, "");

  return payload.codeChallenge === computedChallenge;
}

export function createAccessToken(): string {
  const payload: TokenPayload = {
    type: "access_token",
    exp: Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  };
  return sign(payload);
}

export function verifyAccessToken(token: string): boolean {
  const payload = verify(token);
  return payload !== null && payload.type === "access_token";
}
