import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type RouteParams = {
  params: { id: string } | Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const userId = resolvedParams?.id;
    if (!userId) {
      return NextResponse.json({ error: "Usuario invalido" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, role, password, phone } = body ?? {};

    if (email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { error: "Ya existe una cuenta con ese correo" },
          { status: 409 }
        );
      }
    }

    const data: {
      name?: string | null;
      email?: string;
      role?: Role;
      phone?: string | null;
      passwordHash?: string;
    } = {};

    if (typeof name === "string") {
      data.name = name.trim() || null;
    }
    if (typeof email === "string" && email.trim().length > 0) {
      data.email = email.trim();
    }
    if (typeof phone === "string") {
      data.phone = phone.trim() || null;
    }
    if (role === Role.ADMIN || role === Role.TOURNAMENT_ADMIN) {
      data.role = role;
    }
    if (typeof password === "string" && password.trim().length > 0) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "La contrasena debe tener al menos 6 caracteres" },
          { status: 400 }
        );
      }
      data.passwordHash = await hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Users update error", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el usuario" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const resolvedParams = await params;
    const userId = resolvedParams?.id;
    if (!userId) {
      return NextResponse.json({ error: "Usuario invalido" }, { status: 400 });
    }

    if (session.user.id === userId) {
      return NextResponse.json(
        { error: "No puedes eliminar tu propio usuario" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Users delete error", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el usuario" },
      { status: 500 }
    );
  }
}