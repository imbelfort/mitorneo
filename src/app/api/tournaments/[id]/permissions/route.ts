import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { NextResponse } from "next/server";

const resolveId = (request: Request, resolvedParams?: { id?: string }) => {
  if (resolvedParams?.id) return resolvedParams.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const requireOwnerOrAdmin = async (
  tournamentId: string,
  userId: string,
  role: string
) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { ownerId: true },
  });
  if (!tournament) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 }),
    };
  }
  if (role !== "ADMIN" && tournament.ownerId !== userId) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }
  return { ok: true, tournament };
};

export async function GET(
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

  const access = await requireOwnerOrAdmin(
    tournamentId,
    session.user.id,
    session.user.role
  );
  if (!access.ok) {
    return access.response;
  }

  const permissions = await prisma.tournamentPermission.findMany({
    where: { tournamentId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({
    permissions: permissions.map((entry) => ({
      id: entry.user.id,
      name: entry.user.name,
      email: entry.user.email,
    })),
  });
}

export async function POST(
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

  const access = await requireOwnerOrAdmin(
    tournamentId,
    session.user.id,
    session.user.role
  );
  if (!access.ok) {
    return access.response;
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (access.tournament?.ownerId === user.id) {
    return NextResponse.json({ error: "El usuario ya es propietario" }, { status: 400 });
  }

  await prisma.tournamentPermission.upsert({
    where: {
      tournamentId_userId: {
        tournamentId,
        userId: user.id,
      },
    },
    update: {},
    create: {
      tournamentId,
      userId: user.id,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
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

  const access = await requireOwnerOrAdmin(
    tournamentId,
    session.user.id,
    session.user.role
  );
  if (!access.ok) {
    return access.response;
  }

  const body = await request.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "Usuario requerido" }, { status: 400 });
  }

  if (access.tournament?.ownerId === userId) {
    return NextResponse.json({ error: "No puedes quitar el propietario" }, { status: 400 });
  }

  await prisma.tournamentPermission.deleteMany({
    where: { tournamentId, userId },
  });

  return NextResponse.json({ ok: true });
}
