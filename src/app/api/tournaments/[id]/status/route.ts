import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type StatusInput = "WAITING" | "ACTIVE" | "FINISHED";

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

const parseStatus = (value: unknown): StatusInput | "INVALID" => {
  if (typeof value !== "string") return "INVALID";
  const trimmed = value.trim().toUpperCase();
  if (trimmed === "WAITING" || trimmed === "ACTIVE" || trimmed === "FINISHED") {
    return trimmed as StatusInput;
  }
  return "INVALID";
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const tournamentId = await resolveId(request, params);
  if (!tournamentId) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const status = parseStatus((body as { status?: unknown }).status);
  if (status === "INVALID") {
    return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, ownerId: true, status: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const isOwner =
    session.user.role === "TOURNAMENT_ADMIN" &&
    tournament.ownerId === session.user.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (!isAdmin) {
    if (status !== "FINISHED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (tournament.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "El torneo debe estar activo para finalizar" },
        { status: 400 }
      );
    }
    const categories = await prisma.tournamentCategory.findMany({
      where: { tournamentId },
      select: { drawType: true },
    });
    const hasNonRoundRobin = categories.some(
      (category) => category.drawType !== "ROUND_ROBIN"
    );
    if (categories.length === 0 || hasNonRoundRobin) {
      return NextResponse.json(
        { error: "Solo torneos de grupos pueden finalizarse aqui" },
        { status: 400 }
      );
    }
    const groupMatches = await prisma.tournamentMatch.findMany({
      where: { tournamentId, stage: "GROUP" },
      select: {
        id: true,
        games: true,
        winnerSide: true,
        outcomeType: true,
        outcomeSide: true,
      },
    });
    if (groupMatches.length === 0) {
      return NextResponse.json(
        { error: "Primero registra los partidos de grupos" },
        { status: 400 }
      );
    }
    const isComplete = (match: {
      games: unknown;
      winnerSide: string | null;
      outcomeType: string | null;
      outcomeSide: string | null;
    }) => {
      if (match.outcomeType && match.outcomeType !== "PLAYED") {
        return Boolean(match.outcomeSide || match.winnerSide);
      }
      return Array.isArray(match.games) && match.games.length > 0;
    };
    if (!groupMatches.every(isComplete)) {
      return NextResponse.json(
        { error: "Aun faltan partidos por completar" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status },
    select: { id: true, status: true },
  });

  return NextResponse.json({ tournament: updated });
}
