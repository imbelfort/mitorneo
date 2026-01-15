import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const resolveIds = (request: Request, params?: { id?: string; categoryId?: string }) => {
  if (params?.id && params?.categoryId) {
    return { tournamentId: params.id, categoryId: params.categoryId };
  }
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const categoryIndex = parts.indexOf("categories");
  const tournamentId = categoryIndex > 1 ? parts[categoryIndex - 1] : undefined;
  const categoryId = categoryIndex >= 0 ? parts[categoryIndex + 1] : undefined;
  return { tournamentId, categoryId };
};

const parseBoolean = (value: unknown) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; categoryId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { tournamentId, categoryId } = resolveIds(request, params);
  if (!tournamentId || !categoryId) {
    return NextResponse.json({ error: "Categoria no encontrada" }, { status: 404 });
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
  const parsed = parseBoolean((body as { hasBronzeMatch?: unknown }).hasBronzeMatch);
  if (parsed === null) {
    return NextResponse.json(
      { error: "Valor invalido para partido por 3er lugar" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.tournamentCategory.update({
      where: {
        tournamentId_categoryId: { tournamentId, categoryId },
      },
      data: { hasBronzeMatch: parsed },
      select: { categoryId: true, hasBronzeMatch: true },
    });
    return NextResponse.json({ category: updated });
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la categoria" }, { status: 400 });
  }
}
