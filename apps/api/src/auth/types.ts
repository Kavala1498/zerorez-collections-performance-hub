export type UserRole = 'admin' | 'viewer';

export type AuthUser = {
  email: string;
  name: string | null;
  picture: string | null;
  role: UserRole;
  /** Google subject (`sub`) when authenticated via ID token. */
  sub: string | null;
};

export type TokenPayload = {
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  hd: string | null;
  sub: string;
};

export type VerifyIdToken = (idToken: string) => Promise<TokenPayload>;
