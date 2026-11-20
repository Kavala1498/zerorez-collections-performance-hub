export type UserRole = 'admin' | 'viewer';

export type AuthUser = {
  email: string;
  name: string | null;
  picture: string | null;
  role: UserRole;
};

export type MeResponse = {
  user: AuthUser;
};
