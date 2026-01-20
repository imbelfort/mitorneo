import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const sports = await prisma.sport.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ sports });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { name } = (await request.json().catch(() => ({}))) as {
    name?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json(
      { error: "Nombre de deporte inválido" },
      { status: 400 }
    );
  }

  try {
    const sport = await prisma.sport.create({
      data: { name: name.trim() },
    });
    return NextResponse.json({ sport }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe un deporte con ese nombre"
        : "No se pudo crear el deporte";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}