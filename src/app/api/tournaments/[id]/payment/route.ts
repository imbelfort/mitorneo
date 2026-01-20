import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { NextResponse } from "next/server";

const resolveId = async (
  request: Request,
  params?: { id?: string } | Promise<{ id?: string }>
) => {
  if (params) {
    const resolved =
      typeof (params as Promise<{ id?: string }>).then === "function"
        ? await (params as Promise<{ id?: string }>)
        : (params as { id?: string });
    if (resolved?.id) return resolved.id;
  }
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 2] : undefined;
};

const parseRate = (value: unknown) => {
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const tournamentId = await resolveId(request, resolvedParams);
  if (!tournamentId) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const rate = parseRate((body as { paymentRate?: unknown }).paymentRate);
  if (rate === null || rate < 0) {
    return NextResponse.json({ error: "Monto invalido" }, { status: 400 });
  }

  const existing = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, status: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  if (existing.status === "FINISHED") {
    return NextResponse.json(
      { error: "El torneo ya esta finalizado" },
      { status: 400 }
    );
  }

  const tournament = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { paymentRate: rate },
    select: { id: true, paymentRate: true },
  });

  return NextResponse.json({
    tournament: {
      id: tournament.id,
      paymentRate: tournament.paymentRate.toString(),
    },
  });
}
