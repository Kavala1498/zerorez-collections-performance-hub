import { OAuth2Client } from 'google-auth-library';
import type { TokenPayload, VerifyIdToken } from './types.js';

export function createGoogleIdTokenVerifier(clientId: string): VerifyIdToken {
  const client = new OAuth2Client(clientId);

  return async (idToken: string): Promise<TokenPayload> => {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.sub) {
      throw new Error('Google ID token missing email or subject');
    }
    return {
      email: payload.email,
      emailVerified: payload.email_verified === true,
      name: payload.name ?? null,
      picture: payload.picture ?? null,
      hd: payload.hd ?? null,
      sub: payload.sub,
    };
  };
}
