import { NextResponse } from "next/server";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createAuthToken, setAuthCookie } from "@/lib/auth";
import { getServerSession } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, phone, currentPassword, newPassword } = body as {
    name?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const data: { name?: string | null; phone?: string | null; passwordHash?: string } =
    {};

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    data.name = name.trim();
  }

  if (phone !== undefined) {
    if (typeof phone !== "string") {
      return NextResponse.json({ error: "Telefono invalido" }, { status: 400 });
    }
    data.phone = phone.trim() || null;
  }

  const wantsPasswordChange =
    currentPassword !== undefined || newPassword !== undefined;
  if (wantsPasswordChange) {
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return NextResponse.json(
        { error: "Contrasena actual y nueva son requeridas" },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "La contrasena debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(data).length === 0 && !wantsPasswordChange) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      passwordHash: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (wantsPasswordChange) {
    const valid = await compare(currentPassword as string, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Contrasena actual incorrecta" },
        { status: 400 }
      );
    }
    data.passwordHash = await hash(newPassword as string, 10);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
    },
  });

  const authUser = {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
  };

  const token = await createAuthToken(authUser);
  const response = NextResponse.json({ user: updated });
  setAuthCookie(response, token);
  return response;
}
