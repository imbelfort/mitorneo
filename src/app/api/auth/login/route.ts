import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { createAuthToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body ?? {};

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseAña son requeridos" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    const isValid = await compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciales invalidas" },
        { status: 401 }
      );
    }

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await createAuthToken(authUser);
    const response = NextResponse.json({ user: authUser });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json(
      { error: "No se pudo iniciar sesion" },
      { status: 500 }
    );
  }
}
