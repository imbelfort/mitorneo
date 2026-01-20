import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type MatchSide = "A" | "B";

const resolveId = (request: Request, resolvedParams?: { id?: string }) => {
  if (resolvedParams?.id) return resolvedParams.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 4] : undefined;
};

const parseSide = (value: unknown): MatchSide | null => {
  if (value === "A" || value === "B") return value;
  return null;
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
  const fromMatchId =
    typeof body?.from?.matchId === "string" ? body.from.matchId : null;
  const toMatchId =
    typeof body?.to?.matchId === "string" ? body.to.matchId : null;
  const fromSide = parseSide(body?.from?.side);
  const toSide = parseSide(body?.to?.side);

  if (!fromMatchId || !toMatchId || !fromSide || !toSide) {
    return NextResponse.json(
      { error: "Datos invalidos para actualizar la llave" },
      { status: 400 }
    );
  }

  if (fromMatchId === toMatchId && fromSide === toSide) {
    return NextResponse.json({ updated: 0 });
  }

  const matchIds = Array.from(new Set([fromMatchId, toMatchId]));
  const matches = await prisma.tournamentMatch.findMany({
    where: {
      id: { in: matchIds },
      tournamentId,
      stage: "PLAYOFF",
    },
    select: {
      id: true,
      categoryId: true,
      teamAId: true,
      teamBId: true,
    },
  });

  if (matches.length !== matchIds.length) {
    return NextResponse.json(
      { error: "Partido no encontrado" },
      { status: 404 }
    );
  }

  const matchMap = new Map(matches.map((match) => [match.id, match]));
  const fromMatch = matchMap.get(fromMatchId);
  const toMatch = matchMap.get(toMatchId);

  if (!fromMatch || !toMatch) {
    return NextResponse.json(
      { error: "Partido no encontrado" },
      { status: 404 }
    );
  }

  if (fromMatch.categoryId !== toMatch.categoryId) {
    return NextResponse.json(
      { error: "No se puede mover entre categorias" },
      { status: 400 }
    );
  }

  const getTeam = (match: typeof fromMatch, side: MatchSide) =>
    side === "A" ? match.teamAId : match.teamBId;

  const fromTeam = getTeam(fromMatch, fromSide);
  const toTeam = getTeam(toMatch, toSide);

  if (!fromTeam) {
    return NextResponse.json(
      { error: "No hay equipo para mover" },
      { status: 400 }
    );
  }

  if (fromTeam === toTeam && fromMatchId === toMatchId) {
    return NextResponse.json({ updated: 0 });
  }

  const resetData = {
    games: null,
    winnerSide: null,
    outcomeType: "PLAYED" as const,
    outcomeSide: null,
  };

  if (fromMatchId === toMatchId) {
    const nextTeamAId = fromSide === "A" ? toTeam : fromTeam;
    const nextTeamBId = fromSide === "B" ? toTeam : fromTeam;
    await prisma.tournamentMatch.update({
      where: { id: fromMatchId },
      data: {
        teamAId: nextTeamAId,
        teamBId: nextTeamBId,
        ...resetData,
      },
    });
    return NextResponse.json({ updated: 1 });
  }

  const updates = [
    prisma.tournamentMatch.update({
      where: { id: fromMatchId },
      data: {
        teamAId: fromSide === "A" ? toTeam : fromMatch.teamAId,
        teamBId: fromSide === "B" ? toTeam : fromMatch.teamBId,
        ...resetData,
      },
    }),
    prisma.tournamentMatch.update({
      where: { id: toMatchId },
      data: {
        teamAId: toSide === "A" ? fromTeam : toMatch.teamAId,
        teamBId: toSide === "B" ? fromTeam : toMatch.teamBId,
        ...resetData,
      },
    }),
  ];

  await prisma.$transaction(updates);

  return NextResponse.json({ updated: 2 });
}