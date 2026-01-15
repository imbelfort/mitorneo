import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { GET as getFixturePdf } from "./pdf/route";

const DEFAULT_TIEBREAKERS = [
  "SETS_DIFF",
  "MATCHES_WON",
  "POINTS_PER_MATCH",
  "POINTS_DIFF",
] as const;

const resolveId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const toDateOnly = (value?: Date | string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
};

const normalizeTiebreakerOrder = (value: unknown) => {
  if (!Array.isArray(value)) return [...DEFAULT_TIEBREAKERS];
  const list = value.filter(
    (item): item is string =>
      typeof item === "string" && DEFAULT_TIEBREAKERS.includes(item as never)
  );
  const unique = Array.from(new Set(list));
  const hasAll = DEFAULT_TIEBREAKERS.every((item) => unique.includes(item));
  if (!hasAll || unique.length !== DEFAULT_TIEBREAKERS.length) {
    return [...DEFAULT_TIEBREAKERS];
  }
  return unique;
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url);
  if (url.searchParams.get("format") === "pdf") {
    return getFixturePdf(request, { params });
  }
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
    select: {
      id: true,
      ownerId: true,
      playDays: true,
      status: true,
      paymentRate: true,
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && tournament.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const categories = await prisma.tournamentCategory.findMany({
    where: { tournamentId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
          modality: true,
          gender: true,
          sport: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { category: { name: "asc" } },
  });

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      categoryId: true,
      groupName: true,
      seed: true,
      rankingNumber: true,
      createdAt: true,
      teamName: true,
      player: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          documentType: true,
          documentNumber: true,
        },
      },
      partner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          documentType: true,
          documentNumber: true,
        },
      },
      partnerTwo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          documentType: true,
          documentNumber: true,
        },
      },
    },
  });

  const groupQualifiers = await prisma.tournamentGroupQualifier.findMany({
    where: { tournamentId },
    select: { categoryId: true, groupName: true, qualifiers: true },
  });

  const clubs = await prisma.tournamentClub.findMany({
    where: { tournamentId },
    select: { id: true, name: true, courtsCount: true },
    orderBy: { name: "asc" },
  });

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [
      { scheduledDate: "asc" },
      { startTime: "asc" },
      { createdAt: "asc" },
    ],
    select: {
      id: true,
      categoryId: true,
      groupName: true,
      stage: true,
      winnerSide: true,
      outcomeType: true,
      outcomeSide: true,
      roundNumber: true,
      scheduledDate: true,
      startTime: true,
      games: true,
      teamAId: true,
      teamBId: true,
      clubId: true,
      courtNumber: true,
      createdAt: true,
      isBronzeMatch: true,
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

  const playDays = Array.isArray(tournament.playDays) ? tournament.playDays : [];

  return NextResponse.json({
    tournamentStatus: tournament.status,
    paymentRate: tournament.paymentRate.toString(),
    sessionRole: session.user.role,
    playDays,
    groupPoints: {
      winPoints: groupPoints?.winPoints ?? 0,
      winWithoutGameLossPoints: groupPoints?.winWithoutGameLossPoints ?? 0,
      lossPoints: groupPoints?.lossPoints ?? 0,
      lossWithGameWinPoints: groupPoints?.lossWithGameWinPoints ?? 0,
      tiebreakerOrder: normalizeTiebreakerOrder(groupPoints?.tiebreakerOrder),
    },
    categories: categories.map((item) => ({
      id: item.category.id,
      name: item.category.name,
      abbreviation: item.category.abbreviation,
      modality: item.category.modality,
      gender: item.category.gender,
      sport: item.category.sport,
      drawType: item.drawType,
      groupQualifiers: item.groupQualifiers ?? 2,
      hasBronzeMatch: item.hasBronzeMatch,
    })),
    groupQualifiers: groupQualifiers.map((entry) => ({
      categoryId: entry.categoryId,
      groupName: entry.groupName,
      qualifiers: entry.qualifiers,
    })),
    clubs: clubs.map((club) => ({
      id: club.id,
      name: club.name,
      courtsCount: club.courtsCount,
    })),
    registrations: registrations.map((registration) => ({
      id: registration.id,
      categoryId: registration.categoryId,
      groupName: registration.groupName,
      seed: registration.seed,
      rankingNumber: registration.rankingNumber,
      createdAt: registration.createdAt.toISOString(),
      player: registration.player,
      partner: registration.partner,
      partnerTwo: registration.partnerTwo,
      teamName: registration.teamName,
    })),
    matches: matches.map((match) => ({
      id: match.id,
      categoryId: match.categoryId,
      groupName: match.groupName,
      isBronzeMatch: match.isBronzeMatch,
      stage: match.stage,
      winnerSide: match.winnerSide,
      outcomeType: match.outcomeType,
      outcomeSide: match.outcomeSide,
      roundNumber: match.roundNumber,
      scheduledDate: toDateOnly(match.scheduledDate),
      startTime: match.startTime,
      games: match.games,
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      clubId: match.clubId,
      courtNumber: match.courtNumber,
      createdAt: toDateOnly(match.createdAt),
    })),
  });
}
