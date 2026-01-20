import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const resolveId = async (
  request: Request,
  params?: { id?: string } | Promise<{ id?: string }>
) => {
  if (params) {
    const resolved =
      typeof (params as Promise<{ id?: string }>).then === "function"
        ? await (params as Promise<{ id?: string }>)
        : (params as { id?: string });
    if (resolved?.id) return resolved.id;
  }
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 3] : undefined;
};

const toDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export async function POST(
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

  const tournamentId = await resolveId(request, resolvedParams);
  if (!tournamentId) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    seasonId?: unknown;
  };
  const seasonId = typeof body.seasonId === "string" ? body.seasonId.trim() : "";
  if (!seasonId) {
    return NextResponse.json({ error: "Selecciona una temporada" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      ownerId: true,
      leagueId: true,
      rankingEnabled: true,
      status: true,
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && tournament.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!tournament.rankingEnabled || !tournament.leagueId) {
    return NextResponse.json(
      { error: "Este torneo no tiene ranking por liga" },
      { status: 400 }
    );
  }
  if (tournament.status === "FINISHED") {
    return NextResponse.json(
      { error: "El torneo ya esta finalizado" },
      { status: 400 }
    );
  }

  const season = await prisma.season.findFirst({
    where: { id: seasonId, leagueId: tournament.leagueId },
    select: { id: true, startDate: true, endDate: true },
  });

  if (!season) {
    return NextResponse.json({ error: "Temporada no encontrada" }, { status: 404 });
  }

  const start = season.startDate;
  const end = season.endDate;

  const currentRegistrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: tournament.id },
    select: {
      id: true,
      categoryId: true,
      playerId: true,
      partnerId: true,
      partnerTwoId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (currentRegistrations.length === 0) {
    return NextResponse.json(
      { error: "No hay inscripciones para rankear" },
      { status: 400 }
    );
  }

  const categoryIds = Array.from(
    new Set(currentRegistrations.map((registration) => registration.categoryId))
  );
  const playerRankings = await prisma.playerRanking.findMany({
    where: {
      leagueId: tournament.leagueId,
      seasonId: season.id,
      categoryId: { in: categoryIds },
    },
    select: { playerId: true, categoryId: true, points: true },
  });

  const pointsByPlayerCategory = new Map<string, number>();
  playerRankings.forEach((entry) => {
    pointsByPlayerCategory.set(`${entry.playerId}:${entry.categoryId}`, entry.points);
  });

  const registrationsByCategory = new Map<string, typeof currentRegistrations>();
  currentRegistrations.forEach((registration) => {
    const entries = registrationsByCategory.get(registration.categoryId) ?? [];
    entries.push(registration);
    registrationsByCategory.set(registration.categoryId, entries);
  });

  const updates: { id: string; rankingNumber: number }[] = [];

  registrationsByCategory.forEach((registrations) => {
    const rankings = registrations.map((registration) => {
      const members = [
        registration.playerId,
        registration.partnerId,
        registration.partnerTwoId,
      ].filter(Boolean) as string[];
      const total = members.reduce(
        (sum, playerId) =>
          sum +
          (pointsByPlayerCategory.get(
            `${playerId}:${registration.categoryId}`
          ) ?? 0),
        0
      );
      const average = members.length ? total / members.length : 0;
      return {
        id: registration.id,
        points: average,
        createdAt: registration.createdAt,
      };
    });

    rankings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const timeA = toDate(a.createdAt)?.getTime() ?? 0;
      const timeB = toDate(b.createdAt)?.getTime() ?? 0;
      return timeA - timeB;
    });

    rankings.forEach((entry, index) => {
      updates.push({ id: entry.id, rankingNumber: index + 1 });
    });
  });

  await prisma.$transaction(
    updates.map((entry) =>
      prisma.tournamentRegistration.update({
        where: { id: entry.id },
        data: {
          rankingNumber: entry.rankingNumber,
          rankingType: "LEAGUE",
        },
      })
    )
  );

  return NextResponse.json({
    rankings: updates,
    seasonId: season.id,
  });
}