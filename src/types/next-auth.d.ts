import { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: Role;
  }
}
