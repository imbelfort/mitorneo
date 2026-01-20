import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoryGender, CategoryModality } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const resolveId = (request: Request, resolvedParams?: { id?: string }) => {
  if (resolvedParams?.id) return resolvedParams.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : undefined;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const resolvedParams = await params;
  const categoryId = resolveId(request, resolvedParams);
  if (!categoryId) {
    return NextResponse.json({ error: "Categoria no encontrada" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { sportId, name, abbreviation, modality, gender } = body as {
    sportId?: string;
    name?: string;
    abbreviation?: string;
    modality?: string | null;
    gender?: string | null;
  };

  const data: {
    sportId?: string;
    name?: string;
    abbreviation?: string;
    modality?: CategoryModality | null;
    gender?: CategoryGender | null;
  } = {};

  if (sportId !== undefined) {
    if (!sportId || typeof sportId !== "string") {
      return NextResponse.json({ error: "Deporte requerido" }, { status: 400 });
    }
    data.sportId = sportId.trim();
  }

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    data.name = name.trim();
  }

  if (abbreviation !== undefined) {
    if (typeof abbreviation !== "string" || abbreviation.trim().length < 1) {
      return NextResponse.json({ error: "Abreviacion requerida" }, { status: 400 });
    }
    data.abbreviation = abbreviation.trim();
  }

  if (modality !== undefined) {
    if (modality === null || modality === "") {
      data.modality = null;
    } else if (typeof modality === "string") {
      const trimmed = modality.trim();
      if (!trimmed) {
        data.modality = null;
      } else {
        if (trimmed !== "SINGLES" && trimmed !== "DOUBLES") {
          return NextResponse.json({ error: "Modalidad invalida" }, { status: 400 });
        }
        data.modality = trimmed as CategoryModality;
      }
    } else {
      return NextResponse.json({ error: "Modalidad invalida" }, { status: 400 });
    }
  }

  if (gender !== undefined) {
    if (gender === null || gender === "") {
      data.gender = null;
    } else if (typeof gender === "string") {
      const trimmed = gender.trim();
      if (!trimmed) {
        data.gender = null;
      } else {
        if (trimmed !== "MALE" && trimmed !== "FEMALE" && trimmed !== "MIXED") {
          return NextResponse.json({ error: "Genero invalido" }, { status: 400 });
        }
        data.gender = trimmed as CategoryGender;
      }
    } else {
      return NextResponse.json({ error: "Genero invalido" }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { sport: { select: { id: true, name: true } } },
  });

  if (!category) {
    return NextResponse.json({ error: "Categoria no encontrada" }, { status: 404 });
  }

  if (session.user.role === "TOURNAMENT_ADMIN") {
    if (!category.createdById || category.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "Solo puedes editar tus categorias" },
        { status: 403 }
      );
    }
  }

  let targetSport = category.sport;
  if (data.sportId && data.sportId !== category.sportId) {
    const sport = await prisma.sport.findUnique({
      where: { id: data.sportId },
      select: { id: true, name: true },
    });
    if (!sport) {
      return NextResponse.json({ error: "Deporte no encontrado" }, { status: 404 });
    }
    targetSport = sport;
  }

  const normalizedSport = targetSport.name.toLowerCase().replace(/\s+/g, "");
  const racquetball = normalizedSport === "racquetball" || normalizedSport === "raquetball";
  const targetModality =
    data.modality !== undefined ? data.modality : category.modality;
  const targetGender = data.gender !== undefined ? data.gender : category.gender;

  if (racquetball) {
    if (!targetModality) {
      return NextResponse.json({ error: "Modalidad requerida" }, { status: 400 });
    }
    if (!targetGender) {
      return NextResponse.json({ error: "Genero requerido" }, { status: 400 });
    }
    if (targetModality === "SINGLES" && targetGender === "MIXED") {
      return NextResponse.json(
        { error: "Genero mixto solo aplica a dobles" },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await prisma.category.update({
      where: { id: categoryId },
      data,
      include: { sport: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ category: updated });
  } catch (error: unknown) {
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : undefined;
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe una categoria con ese nombre o abreviacion"
        : "No se pudo actualizar la categoria";
    return NextResponse.json(
      detail ? { error: message, detail } : { error: message },
      { status: 400 }
    );
  }
}