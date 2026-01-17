import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type GameInput = { a?: unknown; b?: unknown };

const parseGames = (value: unknown) => {
  if (!Array.isArray(value)) return [] as { a: number; b: number }[];
  const games: { a: number; b: number }[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const a = (entry as { a?: unknown }).a;
    const b = (entry as { b?: unknown }).b;
    if (typeof a !== "number" || typeof b !== "number") continue;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    games.push({ a, b });
  }
  return games;
};

const computeMatchWinner = (games: { a: number; b: number }[]) => {
  if (games.length === 0) return null;
  let setsA = 0;
  let setsB = 0;
  for (const game of games) {
    if (game.a > game.b) {
      setsA += 1;
    } else if (game.b > game.a) {
      setsB += 1;
    }
  }
  if (setsA === setsB) return null;
  return setsA > setsB ? "A" : "B";
};

const determineWinnerTeamId = (match: {
  winnerSide?: "A" | "B" | null;
  games?: unknown;
  teamAId?: string | null;
  teamBId?: string | null;
}) => {
  if (match.winnerSide === "A") return match.teamAId ?? null;
  if (match.winnerSide === "B") return match.teamBId ?? null;
  const inferred = computeMatchWinner(parseGames(match.games));
  if (inferred === "A") return match.teamAId ?? null;
  if (inferred === "B") return match.teamBId ?? null;
  return null;
};

const isPlaceholderValue = (value?: string | null) => {
  if (!value) return true;
  return /^(bye|empty|pending)-/.test(value);
};

type PlayoffMatchSlot = {
  id: string;
  roundNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  createdAt: Date;
};

const buildPlayoffStructure = (matches: PlayoffMatchSlot[]) => {
  const sorted = [...matches].sort((a, b) => {
    const roundA = a.roundNumber ?? 1;
    const roundB = b.roundNumber ?? 1;
    if (roundA !== roundB) return roundA - roundB;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  const matchesByRound = new Map<number, PlayoffMatchSlot[]>();
  const orderMap = new Map<string, { round: number; order: number }>();
  sorted.forEach((match) => {
    const round = match.roundNumber ?? 1;
    const current = matchesByRound.get(round) ?? [];
    const order = current.length;
    current.push(match);
    matchesByRound.set(round, current);
    orderMap.set(match.id, { round, order });
  });
  return { matchesByRound, orderMap };
};

const propagateWinnerToNextMatch = async (args: {
  tournamentId: string;
  categoryId: string;
  matchId: string;
  winnerTeamId: string;
}) => {
  const { tournamentId, categoryId, matchId, winnerTeamId } = args;
  const playoffMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, categoryId, stage: "PLAYOFF" },
    select: {
      id: true,
      roundNumber: true,
      teamAId: true,
      teamBId: true,
      createdAt: true,
    },
  });
  if (playoffMatches.length === 0) return;
  const { matchesByRound, orderMap } = buildPlayoffStructure(playoffMatches);
  const pos = orderMap.get(matchId);
  if (!pos) return;
  const nextRound = pos.round + 1;
  const nextMatches = matchesByRound.get(nextRound);
  if (!nextMatches) return;
  const targetIndex = Math.floor(pos.order / 2);
  const targetMatch = nextMatches[targetIndex];
  if (!targetMatch) return;
  const slot = pos.order % 2 === 0 ? "teamAId" : "teamBId";
  const currentValue =
    slot === "teamAId" ? targetMatch.teamAId : targetMatch.teamBId;
  if (currentValue && !isPlaceholderValue(currentValue)) {
    return;
  }
  if (currentValue === winnerTeamId) {
    return;
  }
  await prisma.tournamentMatch.update({
    where: { id: targetMatch.id },
    data: { [slot]: winnerTeamId },
  });
};

const propagateLosersToBronzeMatch = async (args: {
  tournamentId: string;
  categoryId: string;
}) => {
  const { tournamentId, categoryId } = args;
  const playoffMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, categoryId, stage: "PLAYOFF" },
    select: {
      id: true,
      roundNumber: true,
      teamAId: true,
      teamBId: true,
      createdAt: true,
      isBronzeMatch: true,
      winnerSide: true,
      games: true,
      outcomeType: true,
      outcomeSide: true,
    },
  });
  if (playoffMatches.length === 0) return;

  const bronzeMatch = playoffMatches.find((entry) => entry.isBronzeMatch);
  if (!bronzeMatch) return;

  const mainMatches = playoffMatches.filter((entry) => !entry.isBronzeMatch);
  if (mainMatches.length === 0) return;

  const finalRound = Math.max(
    ...mainMatches.map((entry) => entry.roundNumber ?? 1),
    1
  );
  if (finalRound <= 1) return;
  const semifinalRound = finalRound - 1;

  const { matchesByRound } = buildPlayoffStructure(mainMatches);
  const semifinalMatches = matchesByRound.get(semifinalRound) ?? [];
  if (semifinalMatches.length === 0) return;

  const loserSlots = semifinalMatches
    .map((match) => {
      const winnerTeamId = determineWinnerTeamId(match);
      if (!winnerTeamId) return null;
      if (match.teamAId && match.teamAId === winnerTeamId) {
        return match.teamBId ?? null;
      }
      if (match.teamBId && match.teamBId === winnerTeamId) {
        return match.teamAId ?? null;
      }
      return null;
    })
    .filter(Boolean) as string[];

  if (loserSlots.length === 0) return;

  const data: Record<string, string> = {};
  const targetSlots = ["teamAId", "teamBId"] as const;
  targetSlots.forEach((slot, index) => {
    const loserId = loserSlots[index];
    if (!loserId) return;
    const currentValue =
      slot === "teamAId" ? bronzeMatch.teamAId : bronzeMatch.teamBId;
    if (currentValue && !isPlaceholderValue(currentValue)) {
      return;
    }
    if (currentValue === loserId) {
      return;
    }
    (data as Record<string, string>)[slot] = loserId;
  });

  if (Object.keys(data).length === 0) {
    return;
  }

  await prisma.tournamentMatch.update({
    where: { id: bronzeMatch.id },
    data,
  });
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await params;
  const token = resolvedParams?.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Token invalido" }, { status: 400 });
  }

  const match = await prisma.tournamentMatch.findUnique({
    where: { refereeToken: token },
    select: {
      id: true,
      tournamentId: true,
      categoryId: true,
      scheduledDate: true,
      startTime: true,
      games: true,
      liveState: true,
      winnerSide: true,
      outcomeType: true,
      outcomeSide: true,
      stage: true,
      isBronzeMatch: true,
      category: { select: { id: true, name: true, abbreviation: true, sport: { select: { name: true } } } },
      tournament: { select: { id: true, name: true, status: true } },
      teamA: {
        select: {
          teamName: true,
          player: { select: { id: true, firstName: true, lastName: true } },
          partner: { select: { id: true, firstName: true, lastName: true } },
          partnerTwo: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      teamB: {
        select: {
          teamName: true,
          player: { select: { id: true, firstName: true, lastName: true } },
          partner: { select: { id: true, firstName: true, lastName: true } },
          partnerTwo: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    match: {
      id: match.id,
      tournamentId: match.tournamentId,
      categoryId: match.categoryId,
      scheduledDate: match.scheduledDate
        ? match.scheduledDate.toISOString().split("T")[0]
        : null,
      startTime: match.startTime,
      games: match.games,
      liveState: match.liveState,
      winnerSide: match.winnerSide,
      outcomeType: match.outcomeType,
      outcomeSide: match.outcomeSide,
      stage: match.stage,
      isBronzeMatch: match.isBronzeMatch,
      category: match.category,
      tournament: match.tournament,
      teamA: match.teamA,
      teamB: match.teamB,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const resolvedParams = await params;
  const token = resolvedParams?.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Token invalido" }, { status: 400 });
  }

  const match = await prisma.tournamentMatch.findUnique({
    where: { refereeToken: token },
    select: {
      id: true,
      tournamentId: true,
      categoryId: true,
      games: true,
      outcomeType: true,
      outcomeSide: true,
      winnerSide: true,
      stage: true,
      isBronzeMatch: true,
      teamAId: true,
      teamBId: true,
      tournament: { select: { status: true } },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }
  if (match.tournament?.status === "FINISHED") {
    return NextResponse.json(
      { error: "El torneo ya esta finalizado" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if ("games" in body) {
    if (body.games === null) {
      data.games = null;
    } else if (!Array.isArray(body.games)) {
      return NextResponse.json({ error: "Juegos invalidos" }, { status: 400 });
    } else {
      const parsedGames: { a: number; b: number }[] = [];
      const games = body.games as GameInput[];
      if (games.length > 7) {
        return NextResponse.json(
          { error: "Cantidad de sets invalida" },
          { status: 400 }
        );
      }
      for (const game of games) {
        if (!game || typeof game !== "object") continue;
        const a = (game as { a?: unknown }).a;
        const b = (game as { b?: unknown }).b;
        if (typeof a !== "number" || typeof b !== "number") {
          return NextResponse.json(
            { error: "Puntaje invalido en un set" },
            { status: 400 }
          );
        }
        if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
          return NextResponse.json(
            { error: "Puntaje invalido en un set" },
            { status: 400 }
          );
        }
        parsedGames.push({ a, b });
      }
      data.games = parsedGames;
    }
  }

  if ("liveState" in body) {
    if (body.liveState === null) {
      data.liveState = null;
    } else if (typeof body.liveState === "object") {
      data.liveState = body.liveState;
    } else {
      return NextResponse.json({ error: "Estado en vivo invalido" }, { status: 400 });
    }
  }

  if (body.finished === true) {
    const winner = computeMatchWinner(parseGames(data.games ?? match.games));
    if (!winner) {
      return NextResponse.json(
        { error: "No se puede finalizar sin ganador" },
        { status: 400 }
      );
    }
    data.winnerSide = winner;
    data.outcomeType = "PLAYED";
    data.outcomeSide = null;
    data.refereeToken = null;
  }

  const updated = await prisma.tournamentMatch.update({
    where: { id: match.id },
    data,
    select: {
      id: true,
      tournamentId: true,
      categoryId: true,
      stage: true,
      isBronzeMatch: true,
      teamAId: true,
      teamBId: true,
      games: true,
      liveState: true,
      winnerSide: true,
      outcomeType: true,
      outcomeSide: true,
    },
  });

  if (body.finished === true && updated.winnerSide) {
    if (updated.stage === "PLAYOFF" && !updated.isBronzeMatch) {
      const winnerTeamId = determineWinnerTeamId(updated);
      if (winnerTeamId) {
        await propagateWinnerToNextMatch({
          tournamentId: updated.tournamentId,
          categoryId: updated.categoryId,
          matchId: updated.id,
          winnerTeamId,
        });
      }
      await propagateLosersToBronzeMatch({
        tournamentId: updated.tournamentId,
        categoryId: updated.categoryId,
      });
    }
  }

  return NextResponse.json({ match: updated });
}
