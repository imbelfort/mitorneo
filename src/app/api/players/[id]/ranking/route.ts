import { prisma } from "@/lib/prisma";
import { computePlayerPointsFromTournament, type TournamentRankingData } from "@/lib/ranking";
import { NextResponse } from "next/server";

const resolveId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const playerId = resolveId(request, params);
  if (!playerId) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  const registrations = await prisma.tournamentRegistration.findMany({
    where: {
      OR: [{ playerId }, { partnerId: playerId }, { partnerTwoId: playerId }],
    },
    select: {
      tournamentId: true,
      tournament: {
        select: { leagueId: true, league: { select: { id: true, name: true } } },
      },
    },
  });

  const leagueMap = new Map<string, { id: string; name: string }>();
  registrations.forEach((registration) => {
    const league = registration.tournament.league;
    if (league?.id && league?.name) {
      leagueMap.set(league.id, { id: league.id, name: league.name });
    }
  });

  if (leagueMap.size === 0) {
    return NextResponse.json({ rankings: [] });
  }

  const leagueRankings = await Promise.all(
    Array.from(leagueMap.values()).map(async (league) => {
      const tournaments = await prisma.tournament.findMany({
        where: {
          leagueId: league.id,
          rankingEnabled: true,
          status: "FINISHED",
        },
        select: {
          id: true,
          categories: { select: { categoryId: true, drawType: true } },
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
          rankingPoints: { select: { placeFrom: true, placeTo: true, points: true } },
        },
      });

      const pointsByPlayer = new Map<string, number>();
      const participants = new Set<string>();

      tournaments.forEach((tournament) => {
        const data = buildRankingData(tournament);
        const result = computePlayerPointsFromTournament(data);
        result.pointsByPlayer.forEach((points, id) => {
          pointsByPlayer.set(id, (pointsByPlayer.get(id) ?? 0) + points);
        });
        result.participants.forEach((id) => participants.add(id));
      });

      const entries = Array.from(participants).map((id) => ({
        playerId: id,
        points: pointsByPlayer.get(id) ?? 0,
      }));

      entries.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.playerId.localeCompare(b.playerId);
      });

      const positionIndex = entries.findIndex((entry) => entry.playerId === playerId);

      return {
        leagueId: league.id,
        leagueName: league.name,
        points: pointsByPlayer.get(playerId) ?? 0,
        position: positionIndex >= 0 ? positionIndex + 1 : null,
        totalPlayers: entries.length,
      };
    })
  );

  return NextResponse.json({ rankings: leagueRankings });
}
