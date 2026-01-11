import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type RankingPointsInput = {
  placeFrom?: unknown;
  placeTo?: unknown;
  points?: unknown;
};

const resolveId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const parsePlaceValue = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePointsValue = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeRankingEntries = (value: unknown) => {
  const list = Array.isArray(value) ? (value as RankingPointsInput[]) : null;
  if (!list) return { error: "Puntos invalidos" };

  const entries: {
    placeFrom: number;
    placeTo: number | null;
    points: number;
  }[] = [];

  for (const entry of list) {
    if (!entry || typeof entry !== "object") {
      return { error: "Puntos invalidos" };
    }

    const placeFrom = parsePlaceValue(entry.placeFrom);
    if (placeFrom === null || placeFrom < 1) {
      return { error: "Lugar inicial invalido" };
    }

    let placeTo: number | null = null;
    if (entry.placeTo === null) {
      placeTo = null;
    } else {
      const placeToProvided =
        entry.placeTo !== undefined &&
        entry.placeTo !== null &&
        !(typeof entry.placeTo === "string" && entry.placeTo.trim() === "");
      if (!placeToProvided) {
        placeTo = placeFrom;
      } else {
        const parsedTo = parsePlaceValue(entry.placeTo);
        if (parsedTo === null || parsedTo < 1) {
          return { error: "Lugar final invalido" };
        }
        placeTo = parsedTo;
      }
    }

    if (placeTo !== null && placeTo < placeFrom) {
      return { error: "El lugar final debe ser mayor o igual al inicial" };
    }

    const points = parsePointsValue(entry.points);
    if (points === null || points < 0) {
      return { error: "Puntos invalidos" };
    }

    entries.push({ placeFrom, placeTo, points });
  }

  return { entries };
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const tournamentId = resolveId(request, params);
  if (!tournamentId) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, ownerId: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && tournament.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const points = await prisma.tournamentRankingPoints.findMany({
    where: { tournamentId },
    orderBy: [{ placeFrom: "asc" }],
  });

  const serialized = points.map((entry) => ({
    id: entry.id,
    placeFrom: entry.placeFrom,
    placeTo: entry.placeTo,
    points: entry.points,
  }));

  return NextResponse.json({ points: serialized });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const tournamentId = resolveId(request, params);
  if (!tournamentId) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, ownerId: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && tournament.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { entries } = body as { entries?: unknown };
  const normalized = normalizeRankingEntries(entries ?? []);
  if (normalized.error) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const rankingEntries = normalized.entries ?? [];

  await prisma.tournamentRankingPoints.deleteMany({ where: { tournamentId } });

  if (rankingEntries.length > 0) {
    await prisma.tournamentRankingPoints.createMany({
      data: rankingEntries.map((entry) => ({
        tournamentId,
        placeFrom: entry.placeFrom,
        placeTo: entry.placeTo,
        points: entry.points,
      })),
    });
  }

  const points = await prisma.tournamentRankingPoints.findMany({
    where: { tournamentId },
    orderBy: [{ placeFrom: "asc" }],
  });

  const serialized = points.map((entry) => ({
    id: entry.id,
    placeFrom: entry.placeFrom,
    placeTo: entry.placeTo,
    points: entry.points,
  }));

  return NextResponse.json({ points: serialized });
}
