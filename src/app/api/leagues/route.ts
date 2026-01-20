import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const leagues = await prisma.league.findMany({
    where: session.user.role === "ADMIN" ? undefined : { ownerId: session.user.id },
    orderBy: { name: "asc" },
    include: {
      seasons: {
        orderBy: { startDate: "desc" },
      },
    },
  });

  return NextResponse.json({ leagues });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, description, photoUrl } = body as {
    name?: string;
    description?: string;
    photoUrl?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  try {
    let owner = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });
    if (!owner && session.user.email) {
      owner = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
    }
    if (!owner) {
      return NextResponse.json(
        {
          error:
            "Usuario no encontrado. Vuelve a iniciar sesion o registra la cuenta.",
        },
        { status: 400 }
      );
    }

    const league = await prisma.league.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        photoUrl: photoUrl ? photoUrl.trim() : null,
        ownerId: owner.id,
      },
    });
    return NextResponse.json({ league }, { status: 201 });
  } catch (error: unknown) {
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : undefined;
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe una liga con ese nombre"
        : "No se pudo crear la liga";
    return NextResponse.json(
      detail ? { error: message, detail } : { error: message },
      { status: 400 }
    );
  }
}