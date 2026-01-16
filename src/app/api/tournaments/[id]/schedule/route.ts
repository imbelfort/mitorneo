import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type ScheduleEntryInput = {
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  matchDurationMinutes?: unknown;
  breakMinutes?: unknown;
};

const resolveId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const parseDateOnly = (value: unknown) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
};

const toDateKey = (value: Date) => value.toISOString().split("T")[0];

const parseTimeValue = (value: unknown) => {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
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

const normalizeSchedule = (
  value: unknown,
  allowedDates: Set<string>
) => {
  const list = Array.isArray(value) ? (value as ScheduleEntryInput[]) : null;
  if (!list) return { error: "Datos invalidos" };

  const entries: {
    date: string;
    startTime: string;
    endTime: string;
    matchDurationMinutes: number;
    breakMinutes: number;
  }[] = [];

  for (const entry of list) {
    if (!entry || typeof entry !== "object") {
      return { error: "Datos invalidos" };
    }
    const dateKey =
      typeof entry.date === "string" ? entry.date.trim() : "";
    if (!dateKey || !allowedDates.has(dateKey)) {
      return { error: "Dia invalido" };
    }

    const startTime =
      typeof entry.startTime === "string" ? entry.startTime.trim() : "";
    const endTime =
      typeof entry.endTime === "string" ? entry.endTime.trim() : "";
    const startMinutes = parseTimeValue(startTime);
    const endMinutes = parseTimeValue(endTime);
    if (startMinutes === null || endMinutes === null) {
      return { error: "Hora invalida" };
    }
    if (endMinutes <= startMinutes) {
      return { error: "La hora de fin debe ser mayor que la de inicio" };
    }

    const matchDuration = parseIntValue(entry.matchDurationMinutes);
    if (matchDuration === null || matchDuration < 1) {
      return { error: "Duracion invalida" };
    }

    const breakMinutes = parseIntValue(entry.breakMinutes);
    if (breakMinutes === null || breakMinutes < 0) {
      return { error: "Tiempo de espera invalido" };
    }

    entries.push({
      date: dateKey,
      startTime,
      endTime,
      matchDurationMinutes: matchDuration,
      breakMinutes,
    });
  }

  return { entries };
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    select: { id: true, ownerId: true, playDays: true, status: true },
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

  const playDays = Array.isArray(tournament.playDays)
    ? tournament.playDays.filter((day): day is string => typeof day === "string")
    : [];

  const schedules = await prisma.tournamentScheduleDay.findMany({
    where: { tournamentId },
    orderBy: { date: "asc" },
  });

  const serializedSchedules = schedules.map((entry) => ({
    date: toDateKey(entry.date),
    startTime: entry.startTime,
    endTime: entry.endTime,
    matchDurationMinutes: entry.matchDurationMinutes,
    breakMinutes: entry.breakMinutes,
  }));

  return NextResponse.json({ playDays, schedules: serializedSchedules });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    select: { id: true, ownerId: true, playDays: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && tournament.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const playDays = Array.isArray(tournament.playDays)
    ? tournament.playDays.filter((day): day is string => typeof day === "string")
    : [];
  const allowedDates = new Set(playDays);

  const body = await request.json().catch(() => ({}));
  const { entries } = body as { entries?: unknown };
  const normalized = normalizeSchedule(entries ?? [], allowedDates);
  if (normalized.error) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const scheduleEntries = normalized.entries ?? [];

  await prisma.tournamentScheduleDay.deleteMany({ where: { tournamentId } });

  if (scheduleEntries.length > 0) {
    await prisma.tournamentScheduleDay.createMany({
      data: scheduleEntries.map((entry) => {
        const parsedDate = parseDateOnly(entry.date);
        if (!parsedDate) {
          throw new Error("Dia invalido");
        }
        return {
          tournamentId,
          date: parsedDate,
          startTime: entry.startTime,
          endTime: entry.endTime,
          matchDurationMinutes: entry.matchDurationMinutes,
          breakMinutes: entry.breakMinutes,
        };
      }),
    });
  }

  const schedules = await prisma.tournamentScheduleDay.findMany({
    where: { tournamentId },
    orderBy: { date: "asc" },
  });

  const serializedSchedules = schedules.map((entry) => ({
    date: toDateKey(entry.date),
    startTime: entry.startTime,
    endTime: entry.endTime,
    matchDurationMinutes: entry.matchDurationMinutes,
    breakMinutes: entry.breakMinutes,
  }));

  return NextResponse.json({ playDays, schedules: serializedSchedules });
}
