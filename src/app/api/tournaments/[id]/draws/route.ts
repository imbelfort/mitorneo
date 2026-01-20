import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type DrawEntryInput = {
  categoryId?: unknown;
  drawType?: unknown;
  groupMinSize?: unknown;
  groupMaxSize?: unknown;
};

const DRAW_TYPES = new Set(["ROUND_ROBIN", "GROUPS_PLAYOFF", "PLAYOFF"]);
const GROUP_DRAW_TYPES = new Set(["ROUND_ROBIN", "GROUPS_PLAYOFF"]);

const resolveId = (request: Request, resolvedParams?: { id?: string }) => {
  if (resolvedParams?.id) return resolvedParams.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const loadDrawCategories = async (tournamentId: string) => {
  const categories = await prisma.tournamentCategory.findMany({
    where: { tournamentId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          abbreviation: true,
          sport: { select: { id: true, name: true } },
        },
      },
    },
  });

  const counts = await prisma.tournamentRegistration.groupBy({
    by: ["categoryId"],
    where: { tournamentId },
    _count: { _all: true },
  });

  const countsMap = new Map<string, number>(
    counts.map((entry) => [entry.categoryId, entry._count._all])
  );

  return categories.map((entry) => ({
    categoryId: entry.categoryId,
    drawType: entry.drawType ?? null,
    groupMinSize: entry.groupMinSize ?? null,
    groupMaxSize: entry.groupMaxSize ?? null,
    registrationCount: countsMap.get(entry.categoryId) ?? 0,
    category: entry.category,
    hasBronzeMatch: entry.hasBronzeMatch,
  }));
};

const parseGroupSize = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
    select: { id: true, ownerId: true, status: true, groupsPublished: true },
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

  const categories = await loadDrawCategories(tournamentId);
  return NextResponse.json({
    categories,
    groupsPublished: tournament.groupsPublished,
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

  const body = await request.json().catch(() => ({}));
  const { entries } = body as { entries?: unknown };
  const list = Array.isArray(entries) ? (entries as DrawEntryInput[]) : null;
  if (!list) {
    return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
  }

  const normalizedEntries: {
    categoryId: string;
    drawType: string;
    groupMinSize: number | null;
    groupMaxSize: number | null;
  }[] = [];
  const seen = new Set<string>();

  for (const entry of list) {
    if (!entry || typeof entry !== "object") {
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
    }
    const categoryId =
      typeof entry.categoryId === "string" ? entry.categoryId.trim() : "";
    if (!categoryId) {
      return NextResponse.json({ error: "Categoria requerida" }, { status: 400 });
    }
    if (seen.has(categoryId)) continue;
    seen.add(categoryId);

    const drawType =
      typeof entry.drawType === "string" ? entry.drawType.trim() : "";
    if (!DRAW_TYPES.has(drawType)) {
      return NextResponse.json(
        { error: "Tipo de sorteo invalido" },
        { status: 400 }
      );
    }

    let groupMinSize: number | null = null;
    let groupMaxSize: number | null = null;

    if (GROUP_DRAW_TYPES.has(drawType)) {
      groupMinSize = parseGroupSize(entry.groupMinSize);
      groupMaxSize = parseGroupSize(entry.groupMaxSize);
      if (groupMinSize === null || groupMinSize < 2) {
        return NextResponse.json(
          { error: "Define un minimo valido por grupo" },
          { status: 400 }
        );
      }
      if (groupMaxSize === null || groupMaxSize < groupMinSize) {
        return NextResponse.json(
          { error: "Define un maximo valido por grupo" },
          { status: 400 }
        );
      }
    }

    normalizedEntries.push({
      categoryId,
      drawType,
      groupMinSize,
      groupMaxSize,
    });
  }

  if (normalizedEntries.length === 0) {
    return NextResponse.json(
      { error: "Debes seleccionar al menos una categoria" },
      { status: 400 }
    );
  }

  const categories = await prisma.tournamentCategory.findMany({
    where: { tournamentId, categoryId: { in: normalizedEntries.map((e) => e.categoryId) } },
    select: { categoryId: true },
  });

  if (categories.length !== normalizedEntries.length) {
    return NextResponse.json(
      { error: "Algunas categorias no pertenecen al torneo" },
      { status: 400 }
    );
  }

  await prisma.$transaction(
    normalizedEntries.map((entry) =>
      prisma.tournamentCategory.update({
        where: {
          tournamentId_categoryId: {
            tournamentId,
            categoryId: entry.categoryId,
          },
        },
        data: {
          drawType: entry.drawType,
          groupMinSize: entry.groupMinSize,
          groupMaxSize: entry.groupMaxSize,
        },
      })
    )
  );

  const updated = await loadDrawCategories(tournamentId);
  return NextResponse.json({ categories: updated });
}

export async function PATCH(
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
  const published =
    typeof body?.groupsPublished === "boolean" ? body.groupsPublished : null;
  if (published === null) {
    return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
  }

  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { groupsPublished: published },
    select: { groupsPublished: true },
  });

  return NextResponse.json({ groupsPublished: updated.groupsPublished });
}