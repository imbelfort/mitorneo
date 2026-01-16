import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type QualifiersInput = {
  categoryId?: unknown;
  groupName?: unknown;
  qualifiers?: unknown;
  groupQualifiers?: unknown;
};

const resolveId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 3] : undefined;
};

const parsePositiveInt = (value: unknown) => {
  if (typeof value === "number") {
    return Number.isInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

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

  const body = (await request.json().catch(() => ({}))) as QualifiersInput;
  const categoryId =
    typeof body.categoryId === "string" ? body.categoryId.trim() : "";
  if (!categoryId) {
    return NextResponse.json({ error: "Categoria requerida" }, { status: 400 });
  }

  const qualifiers = parsePositiveInt(
    body.qualifiers !== undefined ? body.qualifiers : body.groupQualifiers
  );
  if (qualifiers === null) {
    return NextResponse.json(
      { error: "Cantidad de clasificados invalida" },
      { status: 400 }
    );
  }

  const groupName =
    typeof body.groupName === "string" ? body.groupName.trim() : "";
  const normalizedGroupName = groupName.length ? groupName : null;

  const tournamentCategory = await prisma.tournamentCategory.findUnique({
    where: { tournamentId_categoryId: { tournamentId, categoryId } },
    select: { categoryId: true, drawType: true, groupQualifiers: true },
  });

  if (!tournamentCategory) {
    return NextResponse.json({ error: "Categoria no encontrada" }, { status: 404 });
  }

  if (tournamentCategory.drawType !== "GROUPS_PLAYOFF") {
    return NextResponse.json(
      { error: "La categoria no usa playoff por grupos" },
      { status: 400 }
    );
  }

  if (normalizedGroupName) {
    const updated = await prisma.tournamentGroupQualifier.upsert({
      where: {
        tournamentId_categoryId_groupName: {
          tournamentId,
          categoryId,
          groupName: normalizedGroupName,
        },
      },
      update: { qualifiers },
      create: {
        tournamentId,
        categoryId,
        groupName: normalizedGroupName,
        qualifiers,
      },
      select: { categoryId: true, groupName: true, qualifiers: true },
    });

    return NextResponse.json({
      categoryId: updated.categoryId,
      groupName: updated.groupName,
      qualifiers: updated.qualifiers,
    });
  }

  const updated = await prisma.tournamentCategory.update({
    where: { tournamentId_categoryId: { tournamentId, categoryId } },
    data: { groupQualifiers: qualifiers },
    select: { categoryId: true, groupQualifiers: true },
  });

  return NextResponse.json({
    categoryId: updated.categoryId,
    groupQualifiers: updated.groupQualifiers,
  });
}
