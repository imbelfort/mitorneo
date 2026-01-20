import { prisma } from "@/lib/prisma";
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
  return parts.length ? parts[parts.length - 2] : undefined;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const playerId = await resolveId(request, resolvedParams);
  if (!playerId) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  const playerRankings = await prisma.playerRanking.findMany({
    where: { playerId },
    include: {
      league: { select: { id: true, name: true } },
      season: { select: { id: true, name: true, startDate: true, endDate: true } },
      category: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
          sport: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (playerRankings.length === 0) {
    return NextResponse.json({ rankings: [] });
  }

  const rankingsBySeason = await Promise.all(
    playerRankings.map(async (entry) => {
      const standings = await prisma.playerRanking.findMany({
        where: {
          leagueId: entry.leagueId,
          seasonId: entry.seasonId,
          categoryId: entry.categoryId,
        },
        select: { playerId: true, points: true },
      });
      standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.playerId.localeCompare(b.playerId);
      });
      const positionIndex = standings.findIndex(
        (item) => item.playerId === playerId
      );
      return {
        leagueId: entry.leagueId,
        leagueName: entry.league.name,
        seasonId: entry.seasonId,
        seasonName: entry.season.name,
        seasonStart: entry.season.startDate.toISOString(),
        seasonEnd: entry.season.endDate.toISOString(),
        categoryId: entry.categoryId,
        categoryName: entry.category.name,
        categoryAbbreviation: entry.category.abbreviation,
        sportId: entry.category.sport?.id ?? null,
        sportName: entry.category.sport?.name ?? null,
        points: entry.points,
        position: positionIndex >= 0 ? positionIndex + 1 : null,
        totalPlayers: standings.length,
      };
    })
  );

  return NextResponse.json({ rankings: rankingsBySeason });
}