import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type GameInput = {
  a?: unknown;
  b?: unknown;
  durationMinutes?: unknown;
  duration?: unknown;
};

const resolveIds = (
  request: Request,
  params?: { id?: string; matchId?: string }
) => {
  if (params?.id && params?.matchId) {
    return { tournamentId: params.id, matchId: params.matchId };
  }
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const matchesIndex = parts.indexOf("matches");
  return {
    tournamentId:
      params?.id ?? (matchesIndex > 0 ? parts[matchesIndex - 2] : undefined),
    matchId:
      params?.matchId ?? (matchesIndex >= 0 ? parts[matchesIndex + 1] : undefined),
  };
};

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const isValidTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const parseScore = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const parseDuration = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

const parseCourtNumber = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseSide = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (value === "A" || value === "B") return value;
  return "INVALID";
};

const parseOutcomeType = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (value === "PLAYED" || value === "WALKOVER" || value === "INJURY") {
    return value;
  }
  return "INVALID";
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; matchId: string } }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { tournamentId, matchId } = resolveIds(request, params);
  if (!tournamentId || !matchId) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, ownerId: true, playDays: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && tournament.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      tournamentId: true,
      outcomeType: true,
      outcomeSide: true,
    },
  });

  if (!match || match.tournamentId !== tournamentId) {
    return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if ("scheduledDate" in body) {
    const value = body.scheduledDate as string | null | undefined;
    if (value === null || value === "") {
      data.scheduledDate = null;
    } else if (typeof value === "string" && isDateOnly(value)) {
      const playDays = Array.isArray(tournament.playDays) ? tournament.playDays : [];
      if (playDays.length > 0 && !playDays.includes(value)) {
        return NextResponse.json(
          { error: "La fecha no pertenece al torneo" },
          { status: 400 }
        );
      }
      data.scheduledDate = new Date(value);
    } else {
      return NextResponse.json({ error: "Fecha invalida" }, { status: 400 });
    }
  }

  if ("startTime" in body) {
    const value = body.startTime as string | null | undefined;
    if (value === null || value === "") {
      data.startTime = null;
    } else if (typeof value === "string" && isValidTime(value)) {
      data.startTime = value;
    } else {
      return NextResponse.json({ error: "Hora invalida" }, { status: 400 });
    }
  }

  if ("clubId" in body || "courtNumber" in body) {
    const clubRaw = body.clubId as string | null | undefined;
    const courtRaw = body.courtNumber as unknown;
    const clubId =
      typeof clubRaw === "string" ? clubRaw.trim() : clubRaw ?? null;

    if (!clubId) {
      if (clubRaw === null || clubRaw === "" || clubRaw === undefined) {
        data.clubId = null;
        data.courtNumber = null;
      } else {
        return NextResponse.json({ error: "Club invalido" }, { status: 400 });
      }
    } else {
      const courtNumber = parseCourtNumber(courtRaw);
      if (courtNumber === null) {
        return NextResponse.json(
          { error: "Numero de cancha invalido" },
          { status: 400 }
        );
      }
      const club = await prisma.tournamentClub.findFirst({
        where: { id: clubId, tournamentId },
        select: { id: true, courtsCount: true },
      });
      if (!club) {
        return NextResponse.json({ error: "Club no encontrado" }, { status: 404 });
      }
      if (courtNumber > club.courtsCount) {
        return NextResponse.json(
          { error: "La cancha supera el limite del club" },
          { status: 400 }
        );
      }
      data.clubId = club.id;
      data.courtNumber = courtNumber;
    }
  }

  if ("games" in body) {
    if (body.games === null) {
      data.games = null;
    } else if (!Array.isArray(body.games)) {
      return NextResponse.json({ error: "Juegos invalidos" }, { status: 400 });
    } else {
      const parsedGames: { a: number; b: number; durationMinutes?: number }[] =
        [];
      const games = body.games as GameInput[];
      if (games.length > 5) {
        return NextResponse.json(
          { error: "Cantidad de sets invalida" },
          { status: 400 }
        );
      }
      for (const game of games) {
        if (!game || typeof game !== "object") continue;
        const aRaw = game.a;
        const bRaw = game.b;
        const durationRaw =
          game.durationMinutes !== undefined ? game.durationMinutes : game.duration;
        const a = parseScore(aRaw);
        const b = parseScore(bRaw);
        const duration = parseDuration(durationRaw);
        const aHas = hasValue(aRaw);
        const bHas = hasValue(bRaw);
        const durationHas = hasValue(durationRaw);
        if (aHas && a === null) {
          return NextResponse.json(
            { error: "Puntaje invalido en un set" },
            { status: 400 }
          );
        }
        if (bHas && b === null) {
          return NextResponse.json(
            { error: "Puntaje invalido en un set" },
            { status: 400 }
          );
        }
        if (durationHas && duration === null) {
          return NextResponse.json(
            { error: "Duracion invalida en un set" },
            { status: 400 }
          );
        }
        if (!aHas && !bHas && !durationHas) continue;
        if (a === null || b === null) {
          return NextResponse.json(
            { error: "Completa ambos puntajes por set" },
            { status: 400 }
          );
        }
        const entry: { a: number; b: number; durationMinutes?: number } = {
          a,
          b,
        };
        if (duration !== null) {
          entry.durationMinutes = duration;
        }
        parsedGames.push(entry);
      }
      data.games = parsedGames;
    }
  }

  const outcomeTypeRaw = "outcomeType" in body ? body.outcomeType : undefined;
  const outcomeSideRaw = "outcomeSide" in body ? body.outcomeSide : undefined;
  const winnerRaw = "winnerSide" in body ? body.winnerSide : undefined;

  const parsedOutcomeType =
    outcomeTypeRaw !== undefined ? parseOutcomeType(outcomeTypeRaw) : undefined;
  const parsedOutcomeSide =
    outcomeSideRaw !== undefined ? parseSide(outcomeSideRaw) : undefined;
  const parsedWinner =
    winnerRaw !== undefined ? parseSide(winnerRaw) : undefined;

  if (parsedOutcomeType === "INVALID") {
    return NextResponse.json({ error: "Resultado invalido" }, { status: 400 });
  }
  if (parsedOutcomeSide === "INVALID") {
    return NextResponse.json({ error: "Equipo invalido" }, { status: 400 });
  }
  if (parsedWinner === "INVALID") {
    return NextResponse.json({ error: "Ganador invalido" }, { status: 400 });
  }

  if (parsedOutcomeType !== undefined || parsedOutcomeSide !== undefined) {
    const nextOutcomeType =
      parsedOutcomeType ?? match.outcomeType ?? "PLAYED";
    let nextOutcomeSide =
      parsedOutcomeSide !== undefined
        ? parsedOutcomeSide
        : match.outcomeSide ?? null;

    if (nextOutcomeType === "PLAYED") {
      nextOutcomeSide = null;
    }

    if (nextOutcomeType !== "PLAYED" && !nextOutcomeSide) {
      return NextResponse.json(
        { error: "Selecciona el equipo afectado" },
        { status: 400 }
      );
    }

    data.outcomeType = nextOutcomeType;
    data.outcomeSide = nextOutcomeSide;
  }

  if (parsedWinner !== undefined) {
    data.winnerSide = parsedWinner;
  }

  const updated = await prisma.tournamentMatch.update({
    where: { id: matchId },
    data,
    select: {
      id: true,
      categoryId: true,
      groupName: true,
      scheduledDate: true,
      startTime: true,
      games: true,
      winnerSide: true,
      outcomeType: true,
      outcomeSide: true,
      teamAId: true,
      teamBId: true,
      clubId: true,
      courtNumber: true,
    },
  });

  return NextResponse.json({
    match: {
      id: updated.id,
      categoryId: updated.categoryId,
      groupName: updated.groupName,
      scheduledDate: updated.scheduledDate
        ? updated.scheduledDate.toISOString().split("T")[0]
        : null,
      startTime: updated.startTime,
      games: updated.games,
      winnerSide: updated.winnerSide,
      outcomeType: updated.outcomeType,
      outcomeSide: updated.outcomeSide,
      teamAId: updated.teamAId,
      teamBId: updated.teamBId,
      clubId: updated.clubId,
      courtNumber: updated.courtNumber,
    },
  });
}
