import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type PrizeInput = {
  categoryId?: unknown;
  placeFrom?: unknown;
  placeTo?: unknown;
  amount?: unknown;
  prizeText?: unknown;
};

const resolveId = (request: Request, resolvedParams?: { id?: string }) => {
  if (resolvedParams?.id) return resolvedParams.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const parsePlaceValue = (value: unknown) => {
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

const normalizePrizeEntries = (value: unknown, allowedCategoryIds: Set<string>) => {
  const list = Array.isArray(value) ? (value as PrizeInput[]) : null;
  if (!list) return { error: "Premios invalidos" };

  const entries: {
    categoryId: string;
    placeFrom: number;
    placeTo: number | null;
    amount: string | null;
    prizeText: string | null;
  }[] = [];

  for (const entry of list) {
    if (!entry || typeof entry !== "object") {
      return { error: "Premio invalido" };
    }
    const categoryId =
      typeof entry.categoryId === "string" ? entry.categoryId.trim() : "";
    if (!categoryId) {
      return { error: "Categoria requerida" };
    }
    if (!allowedCategoryIds.has(categoryId)) {
      return { error: "Categoria no registrada en el torneo" };
    }

    const placeFrom = parsePlaceValue(entry.placeFrom);
    if (placeFrom === null || placeFrom < 1) {
      return { error: "Lugar inicial invalido" };
    }

    let placeTo: number | null = null;
    if (entry.placeTo === null) {
      placeTo = null;
    } else {
      const placeToProvided =
        entry.placeTo !== undefined &&
        entry.placeTo !== null &&
        !(typeof entry.placeTo === "string" && entry.placeTo.trim() === "");
      if (!placeToProvided) {
        placeTo = placeFrom;
      } else {
        const parsedTo = parsePlaceValue(entry.placeTo);
        if (parsedTo === null || parsedTo < 1) {
          return { error: "Lugar final invalido" };
        }
        placeTo = parsedTo;
      }
    }

    if (placeTo !== null && placeTo < placeFrom) {
      return {
        error: "El lugar final debe ser mayor o igual al lugar inicial",
      };
    }

    const amountProvided =
      entry.amount !== undefined &&
      entry.amount !== null &&
      !(typeof entry.amount === "string" && entry.amount.trim() === "");
    let amount: string | null = null;
    if (amountProvided) {
      const parsedAmount = parsePriceValue(entry.amount);
      if (parsedAmount === null || parsedAmount < 0) {
        return { error: "Monto de premio invalido" };
      }
      amount = parsedAmount.toFixed(2);
    }

    const prizeText =
      typeof entry.prizeText === "string" ? entry.prizeText.trim() : "";
    if (!amountProvided && !prizeText) {
      return { error: "Debes ingresar un premio" };
    }

    entries.push({
      categoryId,
      placeFrom,
      placeTo,
      amount,
      prizeText: prizeText || null,
    });
  }

  return { entries };
};

const prizeInclude = {
  category: {
    select: {
      id: true,
      name: true,
      abbreviation: true,
      sport: { select: { id: true, name: true } },
    },
  },
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

  const prizes = await prisma.tournamentPrize.findMany({
    where: { tournamentId },
    orderBy: [{ categoryId: "asc" }, { placeFrom: "asc" }],
    include: prizeInclude,
  });

  const serialized = prizes.map((prize) => ({
    id: prize.id,
    categoryId: prize.categoryId,
    placeFrom: prize.placeFrom,
    placeTo: prize.placeTo,
    amount: prize.amount ? prize.amount.toString() : null,
    prizeText: prize.prizeText,
    category: prize.category,
  }));

  return NextResponse.json({ prizes: serialized });
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

  const tournamentCategories = await prisma.tournamentCategory.findMany({
    where: { tournamentId },
    select: { categoryId: true },
  });
  const allowedCategoryIds = new Set(
    tournamentCategories.map((item) => item.categoryId)
  );

  const body = await request.json().catch(() => ({}));
  const { entries } = body as { entries?: unknown };

  const normalized = normalizePrizeEntries(entries ?? [], allowedCategoryIds);
  if (normalized.error) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const prizeEntries = normalized.entries ?? [];

  await prisma.tournamentPrize.deleteMany({ where: { tournamentId } });

  if (prizeEntries.length > 0) {
    await prisma.tournamentPrize.createMany({
      data: prizeEntries.map((entry) => ({
        tournamentId,
        categoryId: entry.categoryId,
        placeFrom: entry.placeFrom,
        placeTo: entry.placeTo,
        amount: entry.amount,
        prizeText: entry.prizeText,
      })),
    });
  }

  const prizes = await prisma.tournamentPrize.findMany({
    where: { tournamentId },
    orderBy: [{ categoryId: "asc" }, { placeFrom: "asc" }],
    include: prizeInclude,
  });

  const serialized = prizes.map((prize) => ({
    id: prize.id,
    categoryId: prize.categoryId,
    placeFrom: prize.placeFrom,
    placeTo: prize.placeTo,
    amount: prize.amount ? prize.amount.toString() : null,
    prizeText: prize.prizeText,
    category: prize.category,
  }));

  return NextResponse.json({ prizes: serialized });
}