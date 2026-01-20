export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
};

export type AuthSession = {
  user: AuthUser;
};
