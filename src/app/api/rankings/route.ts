import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalize = (value: string | null) => value?.trim() || "";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sportId = normalize(url.searchParams.get("sportId"));
  const leagueId = normalize(url.searchParams.get("leagueId"));
  const seasonId = normalize(url.searchParams.get("seasonId"));
  const categoryId = normalize(url.searchParams.get("categoryId"));
  const tournamentId = normalize(url.searchParams.get("tournamentId"));
  const search = normalize(url.searchParams.get("search")).toLowerCase();

  let playerIds: string[] | null = null;
  if (tournamentId) {
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId },
      select: { playerId: true, partnerId: true, partnerTwoId: true },
    });
    const ids = new Set<string>();
    for (const reg of registrations) {
      if (reg.playerId) ids.add(reg.playerId);
      if (reg.partnerId) ids.add(reg.partnerId);
      if (reg.partnerTwoId) ids.add(reg.partnerTwoId);
    }
    playerIds = Array.from(ids);
  }

  const rankings = await prisma.playerRanking.findMany({
    where: {
      leagueId: leagueId || undefined,
      seasonId: seasonId || undefined,
      categoryId: categoryId || undefined,
      playerId: playerIds ? { in: playerIds } : undefined,
      category: sportId ? { sportId } : undefined,
    },
    include: {
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photoUrl: true,
          city: true,
          country: true,
        },
      },
      league: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
      category: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
          sport: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ points: "desc" }, { updatedAt: "asc" }],
  });

  const filtered = search
    ? rankings.filter((entry) => {
        const haystack = [
          entry.player.firstName,
          entry.player.lastName,
          entry.player.city,
          entry.player.country,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(search);
      })
    : rankings;

  const rankingsWithRank = filtered.map((entry, index) => ({
    id: entry.id,
    rank: index + 1,
    points: entry.points,
    player: entry.player,
    league: entry.league,
    season: entry.season,
    category: entry.category,
  }));

  return NextResponse.json({ rankings: rankingsWithRank });
}