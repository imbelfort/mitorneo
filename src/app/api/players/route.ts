import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentType, Gender, PlayerStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const isValidEnumValue = <T extends string>(value: string, allowed: T[]): value is T =>
  allowed.includes(value as T);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const where =
    status && isValidEnumValue<PlayerStatus>(status, ["UNCONFIRMED", "CONFIRMED"])
      ? { status }
      : undefined;

  const players = await prisma.player.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      documentType: true,
      documentNumber: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      phone: true,
      gender: true,
      city: true,
      country: true,
      photoUrl: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ players });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    documentType = "ID_CARD",
    documentNumber,
    firstName,
    lastName,
    dateOfBirth,
    phone,
    gender = "NOT_SPECIFIED",
    city,
    country,
    photoUrl,
  } = body as Record<string, unknown>;

  if (!documentNumber || typeof documentNumber !== "string") {
    return NextResponse.json({ error: "Número de documento requerido" }, { status: 400 });
  }
  if (!firstName || typeof firstName !== "string" || !lastName || typeof lastName !== "string") {
    return NextResponse.json({ error: "Nombre y apellido son requeridos" }, { status: 400 });
  }

  if (!isValidEnumValue<DocumentType>(String(documentType), ["ID_CARD", "PASSPORT"])) {
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  }

  if (!isValidEnumValue<Gender>(String(gender), ["MALE", "FEMALE", "OTHER", "NOT_SPECIFIED"])) {
    return NextResponse.json({ error: "Género inválido" }, { status: 400 });
  }

  try {
    const player = await prisma.player.create({
      data: {
        documentType: documentType as DocumentType,
        documentNumber: documentNumber.trim(),
        firstName: (firstName as string).trim(),
        lastName: (lastName as string).trim(),
        dateOfBirth: dateOfBirth ? new Date(String(dateOfBirth)) : null,
        phone: phone ? String(phone) : null,
        gender: gender as Gender,
        city: city ? String(city) : null,
        country: country ? String(country) : null,
        photoUrl: photoUrl ? String(photoUrl) : null,
      },
    });

    return NextResponse.json({ player }, { status: 201 });
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe un jugador con ese documento"
        : "No se pudo crear el jugador";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
