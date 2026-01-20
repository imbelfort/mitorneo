import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentType, Gender, PlayerStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const isValidStatus = (value: string | undefined): value is PlayerStatus =>
  value === "UNCONFIRMED" || value === "CONFIRMED";

const isValidEnum = <T extends string>(value: string | undefined, list: T[]): value is T =>
  !!value && list.includes(value as T);

const resolveId = (request: Request, resolvedParams?: { id?: string }) => {
  if (resolvedParams?.id) return resolvedParams.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : undefined;
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = resolveId(request, resolvedParams);
  if (!id) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  const player = await prisma.player.findUnique({
    where: { id },
  });

  if (!player) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  const registrations = await prisma.tournamentRegistration.findMany({
    where: {
      OR: [{ playerId: id }, { partnerId: id }, { partnerTwoId: id }],
    },
    select: { id: true },
  });

  let matchesPlayed = 0;
  let matchesWon = 0;
  let matchesLost = 0;
  let doubles = 0;
  let triples = 0;

  if (registrations.length > 0) {
    const registrationIds = registrations.map((registration) => registration.id);
    const matches = await prisma.tournamentMatch.findMany({
      where: {
        OR: [
          { teamAId: { in: registrationIds } },
          { teamBId: { in: registrationIds } },
        ],
      },
      select: {
        teamAId: true,
        teamBId: true,
        winnerSide: true,
        outcomeType: true,
        outcomeSide: true,
        games: true,
        liveState: true,
      },
    });

    const resolveWinner = (match: {
      winnerSide: string | null;
      outcomeType: string | null;
      outcomeSide: string | null;
      games: unknown;
    }) => {
      if (match.winnerSide) return match.winnerSide;
      if (match.outcomeType && match.outcomeType !== "PLAYED" && match.outcomeSide) {
        return match.outcomeSide === "A" ? "B" : "A";
      }
      if (!Array.isArray(match.games)) return null;
      let setsA = 0;
      let setsB = 0;
      for (const entry of match.games) {
        if (!entry || typeof entry !== "object") continue;
        const a = (entry as { a?: unknown }).a;
        const b = (entry as { b?: unknown }).b;
        if (typeof a !== "number" || typeof b !== "number") continue;
        if (a > b) setsA += 1;
        if (b > a) setsB += 1;
      }
      if (setsA === 0 && setsB === 0) return null;
      if (setsA === setsB) return null;
      return setsA > setsB ? "A" : "B";
    };

    matches.forEach((match) => {
      if (!match.teamAId || !match.teamBId) return;
      const winner = resolveWinner(match);
      if (!winner) return;
      const isTeamA = registrationIds.includes(match.teamAId);
      const isTeamB = registrationIds.includes(match.teamBId);
      if (!isTeamA && !isTeamB) return;
      matchesPlayed += 1;
      if ((winner === "A" && isTeamA) || (winner === "B" && isTeamB)) {
        matchesWon += 1;
      } else {
        matchesLost += 1;
      }

      const liveState = match.liveState as
        | { bonusByPlayer?: Record<string, { double?: number; triple?: number }> }
        | null
        | undefined;
      const bonusByPlayer = liveState?.bonusByPlayer;
      if (bonusByPlayer && typeof bonusByPlayer === "object") {
        const stats = bonusByPlayer[id];
        if (stats) {
          doubles += Number(stats.double ?? 0);
          triples += Number(stats.triple ?? 0);
        }
      }
    });
  }

  return NextResponse.json({
    player,
    stats: { matchesPlayed, matchesWon, matchesLost, doubles, triples },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const bodyId =
    typeof body.id === "string" && body.id.trim() ? body.id.trim() : undefined;
  const resolvedParams = await params;
  const id = resolvedParams?.id ?? bodyId ?? resolveId(request, resolvedParams);

  if (!id) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  const status = body.status as string | undefined;
  const documentType = body.documentType as string | undefined;
  const documentNumber = body.documentNumber as string | undefined;
  const firstName = body.firstName as string | undefined;
  const lastName = body.lastName as string | undefined;
  const dateOfBirth = body.dateOfBirth as string | null | undefined;
  const phone = body.phone as string | undefined;
  const gender = body.gender as string | undefined;
  const city = body.city as string | undefined;
  const country = body.country as string | undefined;
  const photoUrl = body.photoUrl as string | undefined;

  const data: Record<string, unknown> = {};

  if (status !== undefined && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo admin puede confirmar jugadores" },
      { status: 403 }
    );
  }

  if (status !== undefined) {
    if (!isValidStatus(status)) {
      return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
    }
    data.status = status;
  }

  if (documentType !== undefined) {
    if (typeof documentType !== "string") {
      return NextResponse.json({ error: "Tipo de documento invalido" }, { status: 400 });
    }
    if (!isValidEnum<DocumentType>(documentType, ["ID_CARD", "PASSPORT"])) {
      return NextResponse.json({ error: "Tipo de documento invalido" }, { status: 400 });
    }
    data.documentType = documentType;
  }

  if (documentNumber !== undefined) {
    if (typeof documentNumber !== "string") {
      return NextResponse.json({ error: "Numero de documento invalido" }, { status: 400 });
    }
    if (!documentNumber.trim()) {
      return NextResponse.json({ error: "Numero de documento requerido" }, { status: 400 });
    }
    data.documentNumber = documentNumber.trim();
  }

  if (firstName !== undefined) {
    if (typeof firstName !== "string") {
      return NextResponse.json({ error: "Nombre invalido" }, { status: 400 });
    }
    if (!firstName.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    data.firstName = firstName.trim();
  }

  if (lastName !== undefined) {
    if (typeof lastName !== "string") {
      return NextResponse.json({ error: "Apellido invalido" }, { status: 400 });
    }
    if (!lastName.trim()) {
      return NextResponse.json({ error: "Apellido requerido" }, { status: 400 });
    }
    data.lastName = lastName.trim();
  }

  if (gender !== undefined) {
    if (typeof gender !== "string") {
      return NextResponse.json({ error: "Genero invalido" }, { status: 400 });
    }
    if (!isValidEnum<Gender>(gender, ["MALE", "FEMALE", "OTHER", "NOT_SPECIFIED"])) {
      return NextResponse.json({ error: "Genero invalido" }, { status: 400 });
    }
    data.gender = gender;
  }

  if (dateOfBirth !== undefined) {
    if (dateOfBirth === null || dateOfBirth === "") {
      data.dateOfBirth = null;
    } else if (typeof dateOfBirth === "string") {
      const parsed = new Date(dateOfBirth);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Fecha de nacimiento invalida" },
          { status: 400 }
        );
      }
      data.dateOfBirth = parsed;
    } else {
      return NextResponse.json(
        { error: "Fecha de nacimiento invalida" },
        { status: 400 }
      );
    }
  }

  if (phone !== undefined) data.phone = phone || null;
  if (city !== undefined) data.city = city || null;
  if (country !== undefined) data.country = country || null;
  if (photoUrl !== undefined) data.photoUrl = photoUrl || null;

  try {
    const existing = await prisma.player.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    if (session.user.role === "TOURNAMENT_ADMIN" && existing.createdById) {
      if (existing.createdById !== session.user.id) {
        return NextResponse.json(
          { error: "Solo puedes editar tus jugadores" },
          { status: 403 }
        );
      }
    }

    const player =
      Object.keys(data).length === 0
        ? await prisma.player.findUnique({ where: { id } })
        : await prisma.player.update({
            where: { id },
            data,
          });

    if (!player) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ player });
  } catch (error: unknown) {
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : undefined;
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe un jugador con ese documento"
        : "No se pudo actualizar el jugador";
    return NextResponse.json(
      detail ? { error: message, detail } : { error: message },
      { status: 400 }
    );
  }
}