import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const resolveId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 3] : undefined;
};

const buildGroupLabel = (index: number) => {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) return alphabet[index];
  const first = Math.floor(index / alphabet.length) - 1;
  const second = index % alphabet.length;
  return `${alphabet[first]}${alphabet[second]}`;
};

const buildGroupLabels = (count: number) =>
  Array.from({ length: count }, (_, index) => buildGroupLabel(index));

export async function POST(
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
    select: { id: true, ownerId: true },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (session.user.role !== "ADMIN" && tournament.ownerId !== session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const categoryId =
    typeof body.categoryId === "string" && body.categoryId.trim()
      ? body.categoryId.trim()
      : null;

  if (!categoryId) {
    return NextResponse.json({ error: "Categoria requerida" }, { status: 400 });
  }

  const tournamentCategory = await prisma.tournamentCategory.findUnique({
    where: { tournamentId_categoryId: { tournamentId, categoryId } },
    select: { drawType: true, groupMinSize: true, groupMaxSize: true },
  });

  if (!tournamentCategory) {
    return NextResponse.json({ error: "Categoria no encontrada" }, { status: 404 });
  }

  if (
    tournamentCategory.drawType !== "ROUND_ROBIN" &&
    tournamentCategory.drawType !== "GROUPS_PLAYOFF"
  ) {
    return NextResponse.json(
      { error: "La categoria no usa grupos" },
      { status: 400 }
    );
  }

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { tournamentId, categoryId },
    select: { id: true, seed: true, rankingNumber: true, createdAt: true },
  });

  if (registrations.length === 0) {
    return NextResponse.json({ error: "No hay inscritos" }, { status: 400 });
  }

  const hasRanking = registrations.some(
    (registration) =>
      registration.seed !== null || registration.rankingNumber !== null
  );

  const ordered = [...registrations].sort((a, b) => {
    if (hasRanking) {
      const seedA =
        a.seed ?? a.rankingNumber ?? Number.MAX_SAFE_INTEGER;
      const seedB =
        b.seed ?? b.rankingNumber ?? Number.MAX_SAFE_INTEGER;
      if (seedA !== seedB) return seedA - seedB;
    }
    const timeA = a.createdAt.getTime();
    const timeB = b.createdAt.getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  const minSize =
    typeof tournamentCategory.groupMinSize === "number" &&
    tournamentCategory.groupMinSize >= 2
      ? tournamentCategory.groupMinSize
      : 3;
  const maxSize =
    typeof tournamentCategory.groupMaxSize === "number" &&
    tournamentCategory.groupMaxSize >= minSize
      ? tournamentCategory.groupMaxSize
      : minSize;

  let groupCount = Math.max(1, Math.floor(ordered.length / minSize));
  if (Math.ceil(ordered.length / groupCount) > maxSize) {
    groupCount = Math.max(1, Math.ceil(ordered.length / maxSize));
  }
  const groupLabels = buildGroupLabels(groupCount);

  const assignments = ordered.map((registration, index) => ({
    registrationId: registration.id,
    groupName: groupLabels[index % groupLabels.length],
  }));

  await prisma.$transaction(
    assignments.map((assignment) =>
      prisma.tournamentRegistration.update({
        where: { id: assignment.registrationId },
        data: { groupName: assignment.groupName },
      })
    )
  );

  const groupCounts = assignments.reduce<Record<string, number>>((acc, item) => {
    acc[item.groupName] = (acc[item.groupName] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    groupCount,
    groups: groupCounts,
    assigned: assignments.length,
  });
}
