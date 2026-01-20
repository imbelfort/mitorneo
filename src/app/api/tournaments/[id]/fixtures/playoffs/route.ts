import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { NextResponse } from "next/server";

const DEFAULT_TIEBREAKERS = [
  "SETS_DIFF",
  "MATCHES_WON",
  "POINTS_PER_MATCH",
  "POINTS_DIFF",
] as const;

type Tiebreaker = (typeof DEFAULT_TIEBREAKERS)[number];

type GroupPointsConfig = {
  winPoints: number;
  winWithoutGameLossPoints: number;
  lossPoints: number;
  lossWithGameWinPoints: number;
  tiebreakerOrder: Tiebreaker[];
};

type StandingEntry = {
  id: string;
  groupName: string;
  points: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  seed: number | null;
  rankingNumber: number | null;
  createdAt: Date;
};

const resolveId = (request: Request, resolvedParams?: { id?: string }) => {
  if (resolvedParams?.id) return resolvedParams.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 3] : undefined;
};

const normalizeGroupName = (value?: string | null) => value?.trim() || "A";

const normalizeTiebreakerOrder = (value: unknown) => {
  if (!Array.isArray(value)) return [...DEFAULT_TIEBREAKERS];
  const list = value.filter(
    (item): item is Tiebreaker =>
      typeof item === "string" &&
      (DEFAULT_TIEBREAKERS as readonly string[]).includes(item)
  );
  const unique = Array.from(new Set(list));
  const hasAll = DEFAULT_TIEBREAKERS.every((item) => unique.includes(item));
  if (!hasAll || unique.length !== DEFAULT_TIEBREAKERS.length) {
    return [...DEFAULT_TIEBREAKERS];
  }
  return unique;
};

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

const computeMatchResult = (games: { a: number; b: number }[]) => {
  if (games.length === 0) return null;
  let setsA = 0;
  let setsB = 0;
  let pointsA = 0;
  let pointsB = 0;
  for (const game of games) {
    pointsA += game.a;
    pointsB += game.b;
    if (game.a > game.b) {
      setsA += 1;
    } else if (game.b > game.a) {
      setsB += 1;
    }
  }
  if (setsA === 0 && setsB === 0) return null;
  if (setsA === setsB) return null;
  return {
    setsA,
    setsB,
    pointsA,
    pointsB,
    winner: setsA > setsB ? "A" : "B",
  } as const;
};

const compareStandings = (
  a: StandingEntry,
  b: StandingEntry,
  order: Tiebreaker[]
) => {
  const metrics: Record<Tiebreaker, (item: StandingEntry) => number> = {
    SETS_DIFF: (item) => item.setsWon - item.setsLost,
    MATCHES_WON: (item) => item.matchesWon,
    POINTS_PER_MATCH: (item) => item.points,
    POINTS_DIFF: (item) => item.pointsWon - item.pointsLost,
  };
  for (const rule of order) {
    const diff = metrics[rule](b) - metrics[rule](a);
    if (diff !== 0) return diff;
  }
  const seedA = a.seed ?? a.rankingNumber ?? Number.MAX_SAFE_INTEGER;
  const seedB = b.seed ?? b.rankingNumber ?? Number.MAX_SAFE_INTEGER;
  if (seedA !== seedB) return seedA - seedB;
  return a.createdAt.getTime() - b.createdAt.getTime();
};

const buildGroupStandings = (
  registrations: Array<{
    id: string;
    groupName: string | null;
    seed: number | null;
    rankingNumber: number | null;
    createdAt: Date;
  }>,
  matches: Array<{
    groupName: string | null;
    teamAId: string | null;
    teamBId: string | null;
    games: unknown;
    winnerSide: "A" | "B" | null;
    outcomeType: "PLAYED" | "WALKOVER" | "INJURY";
    outcomeSide: "A" | "B" | null;
  }>,
  groupPoints: GroupPointsConfig
) => {
  const standings = new Map<string, StandingEntry>();
  registrations.forEach((registration) => {
    standings.set(registration.id, {
      id: registration.id,
      groupName: normalizeGroupName(registration.groupName),
      points: 0,
      matchesWon: 0,
      matchesLost: 0,
      setsWon: 0,
      setsLost: 0,
      pointsWon: 0,
      pointsLost: 0,
      seed: registration.seed ?? null,
      rankingNumber: registration.rankingNumber ?? null,
      createdAt: registration.createdAt,
    });
  });

  matches.forEach((match) => {
    const teamAId = match.teamAId;
    const teamBId = match.teamBId;
    if (!teamAId || !teamBId) return;
    const teamA = standings.get(teamAId);
    const teamB = standings.get(teamBId);
    if (!teamA || !teamB) return;

    if (match.outcomeType !== "PLAYED") {
      const winnerSide =
        match.outcomeSide === "A"
          ? "B"
          : match.outcomeSide === "B"
          ? "A"
          : match.winnerSide;
      if (!winnerSide) return;
      if (winnerSide === "A") {
        teamA.matchesWon += 1;
        teamB.matchesLost += 1;
        teamA.points += groupPoints.winWithoutGameLossPoints;
        teamB.points += groupPoints.lossPoints;
      } else {
        teamB.matchesWon += 1;
        teamA.matchesLost += 1;
        teamB.points += groupPoints.winWithoutGameLossPoints;
        teamA.points += groupPoints.lossPoints;
      }
      return;
    }

    const result = computeMatchResult(parseGames(match.games));
    if (result) {
      teamA.setsWon += result.setsA;
      teamA.setsLost += result.setsB;
      teamA.pointsWon += result.pointsA;
      teamA.pointsLost += result.pointsB;
      teamB.setsWon += result.setsB;
      teamB.setsLost += result.setsA;
      teamB.pointsWon += result.pointsB;
      teamB.pointsLost += result.pointsA;

      if (result.winner === "A") {
        teamA.matchesWon += 1;
        teamB.matchesLost += 1;
        teamA.points +=
          result.setsB === 0
            ? groupPoints.winWithoutGameLossPoints
            : groupPoints.winPoints;
        teamB.points +=
          result.setsB > 0
            ? groupPoints.lossWithGameWinPoints
            : groupPoints.lossPoints;
      } else {
        teamB.matchesWon += 1;
        teamA.matchesLost += 1;
        teamB.points +=
          result.setsA === 0
            ? groupPoints.winWithoutGameLossPoints
            : groupPoints.winPoints;
        teamA.points +=
          result.setsA > 0
            ? groupPoints.lossWithGameWinPoints
            : groupPoints.lossPoints;
      }
      return;
    }

    if (match.winnerSide) {
      if (match.winnerSide === "A") {
        teamA.matchesWon += 1;
        teamB.matchesLost += 1;
        teamA.points += groupPoints.winPoints;
        teamB.points += groupPoints.lossPoints;
      } else {
        teamB.matchesWon += 1;
        teamA.matchesLost += 1;
        teamB.points += groupPoints.winPoints;
        teamA.points += groupPoints.lossPoints;
      }
    }
  });

  const groups = new Map<string, StandingEntry[]>();
  standings.forEach((entry) => {
    if (!groups.has(entry.groupName)) {
      groups.set(entry.groupName, []);
    }
    groups.get(entry.groupName)?.push(entry);
  });

  groups.forEach((entries, groupName) => {
    groups.set(
      groupName,
      [...entries].sort((a, b) =>
        compareStandings(a, b, groupPoints.tiebreakerOrder)
      )
    );
  });

  return groups;
};

type BracketSlot = { id: string } | null;
type RoundEntry = {
  roundNumber: number;
  teamAId: string | null;
  teamBId: string | null;
};

const resolveByeWinner = (entry: RoundEntry | undefined) => {
  if (!entry) return null;
  if (entry.teamAId && !entry.teamBId) return entry.teamAId;
  if (entry.teamBId && !entry.teamAId) return entry.teamBId;
  return null;
};

const buildRoundOneEntries = (slots: BracketSlot[]): RoundEntry[] => {
  const bracketSize = slots.length;
  if (bracketSize === 0) return [];
  const matchesCount = Math.max(1, bracketSize / 2);
  return Array.from({ length: matchesCount }, (_, index) => {
    const opponentIndex = bracketSize - 1 - index;
    return {
      roundNumber: 1,
      teamAId: slots[index]?.id ?? null,
      teamBId: slots[opponentIndex]?.id ?? null,
    };
  });
};

const buildBracketMatchesTemplate = (
  bracketSize: number,
  roundOneEntries: RoundEntry[]
) => {
  if (bracketSize <= 1) return [] as RoundEntry[];
  const totalRounds = Math.max(1, Math.floor(Math.log2(bracketSize)));
  const rounds: RoundEntry[][] = [];
  rounds.push(
    roundOneEntries.map((entry) => ({
      roundNumber: 1,
      teamAId: entry.teamAId,
      teamBId: entry.teamBId,
    }))
  );

  for (let round = 2; round <= totalRounds; round += 1) {
    const prev = rounds[round - 2] ?? [];
    const matchesCount = Math.max(1, bracketSize / 2 ** round);
    const current: RoundEntry[] = [];
    for (let index = 0; index < matchesCount; index += 1) {
      const left = prev[index * 2];
      const right = prev[index * 2 + 1];
      const isImmediateFromRoundOne = round === 2;
      current.push({
        roundNumber: round,
        teamAId: isImmediateFromRoundOne ? resolveByeWinner(left) : null,
        teamBId: isImmediateFromRoundOne ? resolveByeWinner(right) : null,
      });
    }
    rounds.push(current);
  }

  return rounds.flat();
};

const collectOrderedGroupQualifiers = (
  groups: Map<string, StandingEntry[]>,
  qualifiersByGroup: Map<string, number> | undefined,
  defaultQualifiers: number,
  groupPoints: GroupPointsConfig
) => {
  const groupNames = Array.from(groups.keys()).sort((a, b) =>
    a.localeCompare(b)
  );
  const qualifiers: {
    entry: StandingEntry;
    position: number;
  }[] = [];

  groupNames.forEach((groupName) => {
    const rawValue = qualifiersByGroup?.get(groupName);
    const groupValue =
      typeof rawValue === "number" && rawValue > 0
        ? rawValue
        : defaultQualifiers;
    const qualifierCount = Math.max(1, Math.floor(groupValue));
    const entries = groups.get(groupName) ?? [];
    for (let index = 0; index < qualifierCount; index += 1) {
      const entry = entries[index];
      if (!entry) break;
      qualifiers.push({
        entry,
        position: index + 1,
      });
    }
  });

  qualifiers.sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    const diff = compareStandings(
      a.entry,
      b.entry,
      groupPoints.tiebreakerOrder
    );
    if (diff !== 0) return diff;
    return a.entry.groupName.localeCompare(b.entry.groupName);
  });

  return qualifiers.map((item) => item.entry);
};

const orderRegistrations = (
  items: Array<{
    id: string;
    seed: number | null;
    rankingNumber: number | null;
    createdAt: Date;
  }>
) => {
  return [...items].sort((a, b) => {
    const seedA = a.seed ?? a.rankingNumber ?? Number.MAX_SAFE_INTEGER;
    const seedB = b.seed ?? b.rankingNumber ?? Number.MAX_SAFE_INTEGER;
    if (seedA !== seedB) return seedA - seedB;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
};

const nextPowerOfTwo = (value: number) => {
  if (value <= 1) return 1;
  let size = 1;
  while (size < value) size *= 2;
  return size;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const tournamentId = resolveId(request, resolvedParams);
  if (!tournamentId) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, ownerId: true, status: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && tournament.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (tournament.status === "FINISHED") {
    return NextResponse.json(
      { error: "El torneo ya esta finalizado" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const categoryId =
    typeof body?.categoryId === "string" ? body.categoryId : null;
  const regenerate = body?.regenerate === true;

  const tournamentCategories = await prisma.tournamentCategory.findMany({
    where: { tournamentId },
    select: {
      categoryId: true,
      drawType: true,
      groupQualifiers: true,
      hasBronzeMatch: true,
      category: { select: { name: true } },
    },
  });

  const playableCategories = tournamentCategories.filter((item) => {
    if (categoryId && item.categoryId !== categoryId) return false;
    return item.drawType === "PLAYOFF" || item.drawType === "GROUPS_PLAYOFF";
  });

  if (playableCategories.length === 0) {
    return NextResponse.json(
      { error: "No hay categorias para generar llaves" },
      { status: 400 }
    );
  }

  const existingPlayoffs = await prisma.tournamentMatch.findMany({
    where: {
      tournamentId,
      stage: "PLAYOFF",
      ...(categoryId ? { categoryId } : {}),
    },
    select: { id: true, categoryId: true },
  });

  const existingByCategory = new Set(
    existingPlayoffs.map((match) => match.categoryId)
  );

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId },
    select: {
      id: true,
      categoryId: true,
      groupName: true,
      seed: true,
      rankingNumber: true,
      createdAt: true,
    },
  });

  const groupMatches = await prisma.tournamentMatch.findMany({
    where: { tournamentId, stage: "GROUP" },
    select: {
      categoryId: true,
      groupName: true,
      teamAId: true,
      teamBId: true,
      games: true,
      winnerSide: true,
      outcomeType: true,
      outcomeSide: true,
    },
  });

  const groupPoints = await prisma.tournamentGroupPoints.findUnique({
    where: { tournamentId },
    select: {
      winPoints: true,
      winWithoutGameLossPoints: true,
      lossPoints: true,
      lossWithGameWinPoints: true,
      tiebreakerOrder: true,
    },
  });

  const groupPointsConfig: GroupPointsConfig = {
    winPoints: groupPoints?.winPoints ?? 0,
    winWithoutGameLossPoints: groupPoints?.winWithoutGameLossPoints ?? 0,
    lossPoints: groupPoints?.lossPoints ?? 0,
    lossWithGameWinPoints: groupPoints?.lossWithGameWinPoints ?? 0,
    tiebreakerOrder: normalizeTiebreakerOrder(groupPoints?.tiebreakerOrder),
  };

  const qualifiers = await prisma.tournamentGroupQualifier.findMany({
    where: { tournamentId },
    select: { categoryId: true, groupName: true, qualifiers: true },
  });

  const qualifiersByCategory = new Map<string, Map<string, number>>();
  qualifiers.forEach((entry) => {
    const groupName = normalizeGroupName(entry.groupName);
    if (!qualifiersByCategory.has(entry.categoryId)) {
      qualifiersByCategory.set(entry.categoryId, new Map());
    }
    qualifiersByCategory.get(entry.categoryId)?.set(groupName, entry.qualifiers);
  });

  const createEntries: Array<{
    tournamentId: string;
    categoryId: string;
    groupName: string | null;
    stage: "PLAYOFF";
    roundNumber: number;
    teamAId: string | null;
    teamBId: string | null;
    isBronzeMatch?: boolean;
  }> = [];

  const deleteCategoryIds: string[] = [];

  playableCategories.forEach((category) => {
    if (existingByCategory.has(category.categoryId) && !regenerate) return;
    if (existingByCategory.has(category.categoryId) && regenerate) {
      deleteCategoryIds.push(category.categoryId);
    }

    const categoryRegistrations = registrations.filter(
      (registration) => registration.categoryId === category.categoryId
    );
    if (categoryRegistrations.length < 2) return;

    if (category.drawType === "GROUPS_PLAYOFF") {
      const categoryMatches = groupMatches.filter(
        (match) => match.categoryId === category.categoryId
      );
      const standingsByGroup = buildGroupStandings(
        categoryRegistrations,
        categoryMatches.map((match) => ({
          groupName: match.groupName,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          games: match.games,
          winnerSide: match.winnerSide ?? null,
          outcomeType: match.outcomeType ?? "PLAYED",
          outcomeSide: match.outcomeSide ?? null,
        })),
        groupPointsConfig
      );
      const defaultQualifiers =
        typeof category.groupQualifiers === "number" &&
        category.groupQualifiers > 0
          ? category.groupQualifiers
          : 2;
      const qualifiersByGroup = qualifiersByCategory.get(category.categoryId);
      const qualifiers = collectOrderedGroupQualifiers(
        standingsByGroup,
        qualifiersByGroup,
        defaultQualifiers,
        groupPointsConfig
      );
      if (qualifiers.length < 2) return;
      const bracketSize = nextPowerOfTwo(qualifiers.length);
      const slots: Array<BracketSlot> = Array.from(
        { length: bracketSize },
        (_, index) => qualifiers[index] ?? null
      );
      const roundOneEntries = buildRoundOneEntries(slots);
      const bracketMatches = buildBracketMatchesTemplate(
        bracketSize,
        roundOneEntries
      );
      bracketMatches.forEach((match) => {
        createEntries.push({
          tournamentId,
          categoryId: category.categoryId,
          groupName: null,
          stage: "PLAYOFF",
          roundNumber: match.roundNumber,
          teamAId: match.teamAId,
          teamBId: match.teamBId,
        });
      });
      if (
        category.hasBronzeMatch &&
        qualifiers.length >= 4 &&
        bracketMatches.length > 0
      ) {
        const finalRound = bracketMatches.reduce(
          (max, current) => Math.max(max, current.roundNumber ?? 1),
          0
        );
        if (finalRound >= 2) {
          createEntries.push({
            tournamentId,
            categoryId: category.categoryId,
            groupName: null,
            stage: "PLAYOFF",
            roundNumber: finalRound + 1,
            teamAId: null,
            teamBId: null,
            isBronzeMatch: true,
          });
        }
      }
      return;
    }

    const ordered = orderRegistrations(
      categoryRegistrations.map((registration) => ({
        id: registration.id,
        seed: registration.seed ?? null,
        rankingNumber: registration.rankingNumber ?? null,
        createdAt: registration.createdAt,
      }))
    );
    if (ordered.length < 2) return;
    const bracketSize = nextPowerOfTwo(ordered.length);
    const slots: Array<BracketSlot> = Array.from(
      { length: bracketSize },
      (_, index) => ordered[index] ?? null
    );
    const roundOneEntries = buildRoundOneEntries(slots);
    const bracketMatches = buildBracketMatchesTemplate(
      bracketSize,
      roundOneEntries
    );
    bracketMatches.forEach((match) => {
      createEntries.push({
        tournamentId,
        categoryId: category.categoryId,
        groupName: null,
        stage: "PLAYOFF",
        roundNumber: match.roundNumber,
        teamAId: match.teamAId,
        teamBId: match.teamBId,
      });
    });
    if (
      category.hasBronzeMatch &&
      ordered.length >= 4 &&
      bracketMatches.length > 0
    ) {
      const finalRound = bracketMatches.reduce(
        (max, current) => Math.max(max, current.roundNumber ?? 1),
        0
      );
      if (finalRound >= 2) {
        createEntries.push({
          tournamentId,
          categoryId: category.categoryId,
          groupName: null,
          stage: "PLAYOFF",
          roundNumber: finalRound + 1,
          teamAId: null,
          teamBId: null,
          isBronzeMatch: true,
        });
      }
    }
  });

  if (deleteCategoryIds.length > 0) {
    await prisma.tournamentMatch.deleteMany({
      where: {
        tournamentId,
        stage: "PLAYOFF",
        categoryId: { in: deleteCategoryIds },
      },
    });
  }

  if (createEntries.length > 0) {
    await prisma.tournamentMatch.createMany({ data: createEntries });
  }

  return NextResponse.json({
    created: createEntries.length,
    deleted: deleteCategoryIds.length,
  });
}
