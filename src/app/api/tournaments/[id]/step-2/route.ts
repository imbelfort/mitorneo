import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type CategoryEntryInput = {
  categoryId?: unknown;
  price?: unknown;
};

const resolveId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const parseDateOnly = (value?: unknown) => {
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

const normalizePlayDates = (
  value: unknown,
  startKey: string,
  endKey: string | null
) => {
  const raw = Array.isArray(value) ? value : [];
  const dates: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== "string") {
      return { error: "Fecha de juego invalida" };
    }
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const parsed = parseDateOnly(trimmed);
    if (!parsed) {
      return { error: "Fecha de juego invalida" };
    }
    const key = toDateKey(parsed);
    if (key < startKey || (endKey && key > endKey)) {
      return { error: "Las fechas de juego deben estar dentro del rango" };
    }
    dates.push(key);
  }

  return { dates: Array.from(new Set(dates)) };
};

const parsePriceValue = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCategoryEntries = (value: unknown) => {
  const list = Array.isArray(value) ? (value as CategoryEntryInput[]) : [];
  const entries = new Map<string, string>();

  for (const entry of list) {
    if (!entry || typeof entry !== "object") {
      return { error: "Categorias invalidas" };
    }
    const categoryId =
      typeof entry.categoryId === "string" ? entry.categoryId.trim() : "";
    if (!categoryId) {
      return { error: "Categoria invalida" };
    }
    const parsedPrice = parsePriceValue(entry.price);
    if (parsedPrice === null) {
      return { error: "Precio de inscripcion invalido" };
    }
    if (parsedPrice < 0) {
      return { error: "El precio de inscripcion debe ser mayor o igual a 0" };
    }
    entries.set(categoryId, parsedPrice.toFixed(2));
  }

  return {
    entries: Array.from(entries).map(([categoryId, price]) => ({
      categoryId,
      price,
    })),
  };
};

export async function PATCH(
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
  const {
    startDate,
    endDate,
    registrationDeadline,
    rulesText,
    playDays,
    categoryEntries,
  } = body as {
    startDate?: unknown;
    endDate?: unknown;
    registrationDeadline?: unknown;
    rulesText?: unknown;
    playDays?: unknown;
    categoryEntries?: unknown;
  };

  const start = parseDateOnly(startDate);
  if (!start) {
    return NextResponse.json({ error: "Fecha de inicio requerida" }, { status: 400 });
  }

  const registration = parseDateOnly(registrationDeadline);
  if (!registration) {
    return NextResponse.json(
      { error: "Fecha de cierre de inscripcion requerida" },
      { status: 400 }
    );
  }

  let end: Date | null = null;
  if (endDate === null || endDate === "" || endDate === undefined) {
    end = null;
  } else {
    end = parseDateOnly(endDate);
    if (!end) {
      return NextResponse.json({ error: "Fecha de fin invalida" }, { status: 400 });
    }
    if (end < start) {
      return NextResponse.json(
        { error: "La fecha de fin debe ser mayor o igual a la fecha de inicio" },
        { status: 400 }
      );
    }
  }

  const rules =
    typeof rulesText === "string" && rulesText.trim().length > 0
      ? rulesText.trim()
      : null;

  const startKey = toDateKey(start);
  const endKey = end ? toDateKey(end) : null;
  const playDatesResult = normalizePlayDates(playDays, startKey, endKey);
  if (playDatesResult.error) {
    return NextResponse.json({ error: playDatesResult.error }, { status: 400 });
  }

  const uniqueDays = playDatesResult.dates ?? [];
  if (uniqueDays.length === 0) {
    return NextResponse.json(
      { error: "Selecciona al menos una fecha de juego" },
      { status: 400 }
    );
  }

  const categoryEntriesResult = normalizeCategoryEntries(categoryEntries);
  if (categoryEntriesResult.error) {
    return NextResponse.json({ error: categoryEntriesResult.error }, { status: 400 });
  }
  const normalizedEntries = categoryEntriesResult.entries ?? [];
  if (normalizedEntries.length === 0) {
    return NextResponse.json(
      { error: "Selecciona al menos una categoria" },
      { status: 400 }
    );
  }

  const existingCategories = await prisma.category.findMany({
    where: {
      id: { in: normalizedEntries.map((entry) => entry.categoryId) },
    },
    select: { id: true },
  });

  if (existingCategories.length !== normalizedEntries.length) {
    return NextResponse.json(
      { error: "Algunas categorias no existen" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        startDate: start,
        endDate: end,
        registrationDeadline: registration,
        rulesText: rules,
        playDays: uniqueDays,
        categories: {
          deleteMany: {},
          create: normalizedEntries.map((entry) => ({
            categoryId: entry.categoryId,
            price: entry.price,
          })),
        },
      },
    });

    return NextResponse.json({ tournament: updated });
  } catch (error: unknown) {
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : undefined;
    return NextResponse.json(
      detail
        ? { error: "No se pudo guardar el paso 2", detail }
        : { error: "No se pudo guardar el paso 2" },
      { status: 400 }
    );
  }
}
