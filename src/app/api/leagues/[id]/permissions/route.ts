import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { NextResponse } from "next/server";

const resolveId = (request: Request, resolvedParams?: { id?: string }) => {
  if (resolvedParams?.id) return resolvedParams.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const requireOwnerOrAdmin = async (leagueId: string, userId: string, role: string) => {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true },
  });
  if (!league) {
    return { ok: false, response: NextResponse.json({ error: "Liga no encontrada" }, { status: 404 }) };
  }
  if (role !== "ADMIN" && league.ownerId !== userId) {
    return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }
  return { ok: true, league };
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

  const leagueId = resolveId(request, resolvedParams);
  if (!leagueId) {
    return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });
  }

  const access = await requireOwnerOrAdmin(leagueId, session.user.id, session.user.role);
  if (!access.ok) {
    return access.response;
  }

  const permissions = await prisma.leaguePermission.findMany({
    where: { leagueId },
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

  const leagueId = resolveId(request, resolvedParams);
  if (!leagueId) {
    return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });
  }

  const access = await requireOwnerOrAdmin(leagueId, session.user.id, session.user.role);
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

  if (access.league?.ownerId === user.id) {
    return NextResponse.json({ error: "El usuario ya es propietario" }, { status: 400 });
  }

  await prisma.leaguePermission.upsert({
    where: {
      leagueId_userId: {
        leagueId,
        userId: user.id,
      },
    },
    update: {},
    create: {
      leagueId,
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

  const leagueId = resolveId(request, resolvedParams);
  if (!leagueId) {
    return NextResponse.json({ error: "Liga no encontrada" }, { status: 404 });
  }

  const access = await requireOwnerOrAdmin(leagueId, session.user.id, session.user.role);
  if (!access.ok) {
    return access.response;
  }

  const body = await request.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "Usuario requerido" }, { status: 400 });
  }

  if (access.league?.ownerId === userId) {
    return NextResponse.json({ error: "No puedes quitar el propietario" }, { status: 400 });
  }

  await prisma.leaguePermission.deleteMany({
    where: { leagueId, userId },
  });

  return NextResponse.json({ ok: true });
}
