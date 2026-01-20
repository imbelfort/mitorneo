import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const resolveId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const leagueId = resolveId(request, resolvedParams);
  if (!leagueId) {
    return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && league.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const seasons = await prisma.season.findMany({
    where: { leagueId },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({ seasons });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const leagueId = resolveId(request, resolvedParams);
  if (!leagueId) {
    return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true },
  });

  if (!league) {
    return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && league.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, startDate, endDate } = body as {
    name?: string;
    startDate?: string;
    endDate?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }

  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start || !end) {
    return NextResponse.json({ error: "Fechas invalidas" }, { status: 400 });
  }

  if (end < start) {
    return NextResponse.json(
      { error: "La fecha de fin debe ser mayor o igual a la fecha de inicio" },
      { status: 400 }
    );
  }

  try {
    const season = await prisma.season.create({
      data: {
        leagueId,
        name: name.trim(),
        startDate: start,
        endDate: end,
      },
    });

    return NextResponse.json({ season }, { status: 201 });
  } catch (error: unknown) {
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : undefined;
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe una temporada con ese nombre"
        : "No se pudo crear la temporada";
    return NextResponse.json(
      detail ? { error: message, detail } : { error: message },
      { status: 400 }
    );
  }
}
