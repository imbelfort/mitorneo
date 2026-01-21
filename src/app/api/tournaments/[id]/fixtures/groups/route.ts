import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { canManageTournament } from "@/lib/permissions";
import { NextResponse } from "next/server";

type GroupEntry = {
  registrationId?: unknown;
  groupName?: unknown;
};

const resolveId = (request: Request, resolvedParams?: { id?: string }) => {
  if (resolvedParams?.id) return resolvedParams.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 3] : undefined;
};

const normalizeGroupName = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 20) return null;
  return trimmed;
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const session = await getServerSession();
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

  const canManage = await canManageTournament(
    session.user,
    tournamentId,
    tournament.ownerId
  );
  if (!canManage) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (tournament.status === "FINISHED") {
    return NextResponse.json(
      { error: "El torneo ya esta finalizado" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const entries = Array.isArray(body.entries) ? (body.entries as GroupEntry[]) : [];
  if (entries.length === 0) {
    return NextResponse.json({ error: "No hay grupos para guardar" }, { status: 400 });
  }

  const normalizedEntries = entries.map((entry) => ({
    registrationId:
      typeof entry.registrationId === "string" && entry.registrationId.trim()
        ? entry.registrationId.trim()
        : null,
    groupName: normalizeGroupName(entry.groupName),
  }));

  if (normalizedEntries.some((entry) => !entry.registrationId)) {
    return NextResponse.json({ error: "Registro invalido" }, { status: 400 });
  }

  const registrationIds = normalizedEntries
    .map((entry) => entry.registrationId as string)
    .filter(Boolean);

  const registrations = await prisma.tournamentRegistration.findMany({
    where: { id: { in: registrationIds }, tournamentId },
    select: { id: true },
  });

  if (registrations.length !== registrationIds.length) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  await prisma.$transaction(
    normalizedEntries.map((entry) =>
      prisma.tournamentRegistration.update({
        where: { id: entry.registrationId as string },
        data: { groupName: entry.groupName },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
