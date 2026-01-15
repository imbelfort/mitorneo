import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  computePlayerPointsFromTournament,
  type TournamentRankingData,
} from "@/lib/ranking";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const resolveId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id;
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

const buildRankingData = (tournament: {
  categories: { categoryId: string; drawType: string | null }[];
  registrations: {
    id: string;
    categoryId: string;
    groupName: string | null;
    seed: number | null;
    rankingNumber: number | null;
    createdAt: Date;
    playerId: string;
    partnerId: string | null;
    partnerTwoId: string | null;
  }[];
  matches: {
    categoryId: string;
    groupName: string | null;
    stage: string | null;
    roundNumber: number | null;
    games: unknown;
    teamAId: string | null;
    teamBId: string | null;
    winnerSide: string | null;
    outcomeType: string | null;
    outcomeSide: string | null;
    isBronzeMatch: boolean;
  }[];
  groupPoints: {
    winPoints: number;
    winWithoutGameLossPoints: number;
    lossPoints: number;
    lossWithGameWinPoints: number;
    tiebreakerOrder: unknown;
  } | null;
  rankingPoints: { placeFrom: number; placeTo: number | null; points: number }[];
}): TournamentRankingData => ({
  categories: tournament.categories.map((entry) => ({
    categoryId: entry.categoryId,
    drawType: entry.drawType as TournamentRankingData["categories"][number]["drawType"],
  })),
  registrations: tournament.registrations.map((registration) => ({
    id: registration.id,
    categoryId: registration.categoryId,
    groupName: registration.groupName,
    seed: registration.seed,
    rankingNumber: registration.rankingNumber,
    createdAt: registration.createdAt,
    playerId: registration.playerId,
    partnerId: registration.partnerId,
    partnerTwoId: registration.partnerTwoId,
  })),
  matches: tournament.matches.map((match) => ({
    categoryId: match.categoryId,
    groupName: match.groupName,
    stage: match.stage as TournamentRankingData["matches"][number]["stage"],
    roundNumber: match.roundNumber,
    games: match.games,
    teamAId: match.teamAId,
    teamBId: match.teamBId,
    winnerSide: match.winnerSide as TournamentRankingData["matches"][number]["winnerSide"],
    outcomeType: match.outcomeType as TournamentRankingData["matches"][number]["outcomeType"],
    outcomeSide: match.outcomeSide as TournamentRankingData["matches"][number]["outcomeSide"],
    isBronzeMatch: match.isBronzeMatch,
  })),
  groupPoints: tournament.groupPoints
    ? {
        winPoints: tournament.groupPoints.winPoints,
        winWithoutGameLossPoints: tournament.groupPoints.winWithoutGameLossPoints,
        lossPoints: tournament.groupPoints.lossPoints,
        lossWithGameWinPoints: tournament.groupPoints.lossWithGameWinPoints,
        tiebreakerOrder: tournament.groupPoints.tiebreakerOrder,
      }
    : null,
  rankingPoints: tournament.rankingPoints ?? [],
});

export async function POST(
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

  const season = await prisma.season.findFirst({
    where: { id: seasonId, leagueId: tournament.leagueId },
    select: { id: true, startDate: true, endDate: true },
  });

  if (!season) {
    return NextResponse.json({ error: "Temporada no encontrada" }, { status: 404 });
  }

  const start = season.startDate;
  const end = season.endDate;

  const leagueTournaments = await prisma.tournament.findMany({
    where: {
      leagueId: tournament.leagueId,
      rankingEnabled: true,
      status: "FINISHED",
      OR: [
        { startDate: { gte: start, lte: end } },
        { startDate: null, createdAt: { gte: start, lte: end } },
      ],
    },
    select: {
      id: true,
      categories: {
        select: { categoryId: true, drawType: true },
      },
      registrations: {
        select: {
          id: true,
          categoryId: true,
          groupName: true,
          seed: true,
          rankingNumber: true,
          createdAt: true,
          playerId: true,
          partnerId: true,
          partnerTwoId: true,
        },
      },
      matches: {
        select: {
          categoryId: true,
          groupName: true,
          stage: true,
          roundNumber: true,
          games: true,
          teamAId: true,
          teamBId: true,
          winnerSide: true,
          outcomeType: true,
          outcomeSide: true,
          isBronzeMatch: true,
        },
      },
      groupPoints: {
        select: {
          winPoints: true,
          winWithoutGameLossPoints: true,
          lossPoints: true,
          lossWithGameWinPoints: true,
          tiebreakerOrder: true,
        },
      },
      rankingPoints: {
        select: { placeFrom: true, placeTo: true, points: true },
      },
    },
  });

  const pointsByPlayer = new Map<string, number>();
  leagueTournaments.forEach((entry) => {
    const data = buildRankingData(entry);
    const result = computePlayerPointsFromTournament(data);
    result.pointsByPlayer.forEach((points, playerId) => {
      pointsByPlayer.set(playerId, (pointsByPlayer.get(playerId) ?? 0) + points);
    });
  });

  const currentRegistrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: tournament.id },
    select: {
      id: true,
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

  const rankings = currentRegistrations.map((registration) => {
    const members = [
      registration.playerId,
      registration.partnerId,
      registration.partnerTwoId,
    ].filter(Boolean) as string[];
    const total = members.reduce(
      (sum, playerId) => sum + (pointsByPlayer.get(playerId) ?? 0),
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

  const updates = rankings.map((entry, index) => ({
    id: entry.id,
    rankingNumber: index + 1,
  }));

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
