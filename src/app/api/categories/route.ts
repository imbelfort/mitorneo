import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CategoryGender, CategoryModality } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const isValidEnum = <T extends string>(value: string, allowed: T[]): value is T =>
  allowed.includes(value as T);

const isRacquetballName = (name: string | null | undefined) => {
  if (!name) return false;
  const normalized = name.toLowerCase().replace(/\s+/g, "");
  return normalized === "racquetball" || normalized === "raquetball";
};

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = new URL(request.url);
  const sportId = url.searchParams.get("sportId");
  const scope = url.searchParams.get("scope");

  const where = {
    ...(sportId ? { sportId } : {}),
    ...(scope === "own" && session.user.role === "TOURNAMENT_ADMIN"
      ? { createdById: session.user.id }
      : {}),
  };

  const categories = await prisma.category.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: [{ name: "asc" }],
    include: { sport: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { sportId, name, abbreviation, modality, gender } = body as {
    sportId?: string;
    name?: string;
    abbreviation?: string;
    modality?: string | null;
    gender?: string | null;
  };

  if (!sportId || typeof sportId !== "string") {
    return NextResponse.json({ error: "Deporte requerido" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  }
  if (!abbreviation || typeof abbreviation !== "string" || abbreviation.trim().length < 1) {
    return NextResponse.json({ error: "Abreviacion requerida" }, { status: 400 });
  }

  const sport = await prisma.sport.findUnique({
    where: { id: sportId.trim() },
    select: { id: true, name: true },
  });

  if (!sport) {
    return NextResponse.json({ error: "Deporte no encontrado" }, { status: 404 });
  }

  const normalizedModality = typeof modality === "string" ? modality.trim() : null;
  const normalizedGender = typeof gender === "string" ? gender.trim() : null;
  const modalityValue = normalizedModality ? normalizedModality : null;
  const genderValue = normalizedGender ? normalizedGender : null;

  if (modality !== undefined && modality !== null && typeof modality !== "string") {
    return NextResponse.json({ error: "Modalidad invalida" }, { status: 400 });
  }
  if (gender !== undefined && gender !== null && typeof gender !== "string") {
    return NextResponse.json({ error: "Genero invalido" }, { status: 400 });
  }

  const racquetball = isRacquetballName(sport.name);

  if (
    modalityValue &&
    !isValidEnum<CategoryModality>(modalityValue, ["SINGLES", "DOUBLES"])
  ) {
    return NextResponse.json({ error: "Modalidad invalida" }, { status: 400 });
  }
  if (
    genderValue &&
    !isValidEnum<CategoryGender>(genderValue, ["MALE", "FEMALE", "MIXED"])
  ) {
    return NextResponse.json({ error: "Genero invalido" }, { status: 400 });
  }

  if (racquetball) {
    if (!modalityValue) {
      return NextResponse.json({ error: "Modalidad requerida" }, { status: 400 });
    }
    if (!genderValue) {
      return NextResponse.json({ error: "Genero requerido" }, { status: 400 });
    }
    if (modalityValue === "SINGLES" && genderValue === "MIXED") {
      return NextResponse.json(
        { error: "Genero mixto solo aplica a dobles" },
        { status: 400 }
      );
    }
  }

  try {
    const category = await prisma.category.create({
      data: {
        createdById: session.user.id,
        sportId: sport.id,
        name: name.trim(),
        abbreviation: abbreviation.trim(),
        modality: modalityValue ? (modalityValue as CategoryModality) : null,
        gender: genderValue ? (genderValue as CategoryGender) : null,
      },
      include: { sport: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error: unknown) {
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : undefined;
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe una categoria con ese nombre o abreviacion"
        : "No se pudo crear la categoria";
    return NextResponse.json(
      detail ? { error: message, detail } : { error: message },
      { status: 400 }
    );
  }
}