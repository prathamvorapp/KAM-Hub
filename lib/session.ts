import { SignJWT, jwtVerify } from 'jose';

const SESSION_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'fallback-secret-for-development-only';
const secret = new TextEncoder().encode(SESSION_SECRET);

/**
 * Signs a session string using JWT (Edge compatible)
 */
export async function signSession(data: string): Promise<string> {
  const payload = JSON.parse(data);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
}

/**
 * Verifies a signed session (JWT) and returns the data if valid
 */
export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return JSON.stringify(payload);
  } catch (e) {
    console.error('JWT verification failed:', e);
    return null;
  }
}
