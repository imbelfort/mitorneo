import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type GroupPointsInput = {
  winPoints?: unknown;
  winWithoutGameLossPoints?: unknown;
  lossPoints?: unknown;
  lossWithGameWinPoints?: unknown;
  tiebreakerOrder?: unknown;
};

const DEFAULT_TIEBREAKERS = [
  "SETS_DIFF",
  "MATCHES_WON",
  "POINTS_PER_MATCH",
  "POINTS_DIFF",
] as const;

type Tiebreaker = (typeof DEFAULT_TIEBREAKERS)[number];

const resolveId = (request: Request, resolvedParams?: { id?: string }) => {
  if (resolvedParams?.id) return resolvedParams.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const parseIntValue = (value: unknown) => {
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

const normalizeTiebreakerOrder = (value: unknown) => {
  if (value === undefined || value === null) {
    return { order: [...DEFAULT_TIEBREAKERS] };
  }
  if (!Array.isArray(value)) {
    return { error: "Orden de desempate invalido" };
  }
  const list = value.filter(
    (item): item is Tiebreaker =>
      typeof item === "string" &&
      (DEFAULT_TIEBREAKERS as readonly string[]).includes(item)
  );
  if (list.length !== value.length) {
    return { error: "Orden de desempate invalido" };
  }
  const unique = Array.from(new Set(list));
  if (unique.length !== DEFAULT_TIEBREAKERS.length) {
    return { error: "Orden de desempate incompleto" };
  }
  const missing = DEFAULT_TIEBREAKERS.find((item) => !unique.includes(item));
  if (missing) {
    return { error: "Orden de desempate incompleto" };
  }
  return { order: unique };
};

const normalizeGroupPoints = (input: GroupPointsInput) => {
  const winPoints = parseIntValue(input.winPoints);
  if (winPoints === null || winPoints < 0) {
    return { error: "Puntos de victoria invalidos" };
  }

  const lossPoints = parseIntValue(input.lossPoints);
  if (lossPoints === null || lossPoints < 0) {
    return { error: "Puntos de derrota invalidos" };
  }

  const winWithoutGameLossPoints = parseIntValue(input.winWithoutGameLossPoints);
  if (winWithoutGameLossPoints === null || winWithoutGameLossPoints < 0) {
    return { error: "Puntos por ganar sin perder cancha invalidos" };
  }

  const lossWithGameWinPoints = parseIntValue(input.lossWithGameWinPoints);
  if (lossWithGameWinPoints === null || lossWithGameWinPoints < 0) {
    return { error: "Puntos por cancha ganada invalidos" };
  }

  const tiebreaker = normalizeTiebreakerOrder(input.tiebreakerOrder);
  if ("error" in tiebreaker) {
    return { error: tiebreaker.error };
  }

  return {
    winPoints,
    winWithoutGameLossPoints,
    lossPoints,
    lossWithGameWinPoints,
    tiebreakerOrder: tiebreaker.order,
  };
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

  const points = await prisma.tournamentGroupPoints.findUnique({
    where: { tournamentId },
  });
  const normalizedOrder = normalizeTiebreakerOrder(points?.tiebreakerOrder);
  const tiebreakerOrder =
    "order" in normalizedOrder ? normalizedOrder.order : [...DEFAULT_TIEBREAKERS];

  return NextResponse.json({
    groupPoints: {
      winPoints: points?.winPoints ?? 0,
      winWithoutGameLossPoints: points?.winWithoutGameLossPoints ?? 0,
      lossPoints: points?.lossPoints ?? 0,
      lossWithGameWinPoints: points?.lossWithGameWinPoints ?? 0,
      tiebreakerOrder,
    },
  });
}

export async function PUT(
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

  const body = (await request.json().catch(() => ({}))) as GroupPointsInput;
  const normalized = normalizeGroupPoints(body);
  if ("error" in normalized) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const {
    winPoints,
    winWithoutGameLossPoints,
    lossPoints,
    lossWithGameWinPoints,
    tiebreakerOrder,
  } =
    normalized;

  const points = await prisma.tournamentGroupPoints.upsert({
    where: { tournamentId },
    create: {
      tournamentId,
      winPoints,
      winWithoutGameLossPoints,
      lossPoints,
      lossWithGameWinPoints,
      tiebreakerOrder,
    },
    update: {
      winPoints,
      winWithoutGameLossPoints,
      lossPoints,
      lossWithGameWinPoints,
      tiebreakerOrder,
    },
  });

  return NextResponse.json({
    groupPoints: {
      winPoints: points.winPoints,
      winWithoutGameLossPoints: points.winWithoutGameLossPoints,
      lossPoints: points.lossPoints,
      lossWithGameWinPoints: points.lossWithGameWinPoints,
      tiebreakerOrder,
    },
  });
}