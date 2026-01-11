import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DocumentType, Gender, PlayerStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const isValidStatus = (value: string | undefined): value is PlayerStatus =>
  value === "UNCONFIRMED" || value === "CONFIRMED";

const isValidEnum = <T extends string>(value: string | undefined, list: T[]): value is T =>
  !!value && list.includes(value as T);

const resolveId = (request: Request, params?: { id?: string }) => {
  if (params?.id) return params.id;
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : undefined;
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = resolveId(request, params);
  if (!id) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  const player = await prisma.player.findUnique({
    where: { id },
  });

  if (!player) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ player });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const bodyId =
    typeof body.id === "string" && body.id.trim() ? body.id.trim() : undefined;
  const id = params?.id ?? bodyId ?? resolveId(request, params);

  if (!id) {
    return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  const status = body.status as string | undefined;
  const documentType = body.documentType as string | undefined;
  const documentNumber = body.documentNumber as string | undefined;
  const firstName = body.firstName as string | undefined;
  const lastName = body.lastName as string | undefined;
  const dateOfBirth = body.dateOfBirth as string | null | undefined;
  const phone = body.phone as string | undefined;
  const gender = body.gender as string | undefined;
  const city = body.city as string | undefined;
  const country = body.country as string | undefined;
  const photoUrl = body.photoUrl as string | undefined;

  const data: Record<string, unknown> = {};

  if (status !== undefined && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Solo admin puede confirmar jugadores" },
      { status: 403 }
    );
  }

  if (status !== undefined) {
    if (!isValidStatus(status)) {
      return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
    }
    data.status = status;
  }

  if (documentType !== undefined) {
    if (typeof documentType !== "string") {
      return NextResponse.json({ error: "Tipo de documento invalido" }, { status: 400 });
    }
    if (!isValidEnum<DocumentType>(documentType, ["ID_CARD", "PASSPORT"])) {
      return NextResponse.json({ error: "Tipo de documento invalido" }, { status: 400 });
    }
    data.documentType = documentType;
  }

  if (documentNumber !== undefined) {
    if (typeof documentNumber !== "string") {
      return NextResponse.json({ error: "Numero de documento invalido" }, { status: 400 });
    }
    if (!documentNumber.trim()) {
      return NextResponse.json({ error: "Numero de documento requerido" }, { status: 400 });
    }
    data.documentNumber = documentNumber.trim();
  }

  if (firstName !== undefined) {
    if (typeof firstName !== "string") {
      return NextResponse.json({ error: "Nombre invalido" }, { status: 400 });
    }
    if (!firstName.trim()) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }
    data.firstName = firstName.trim();
  }

  if (lastName !== undefined) {
    if (typeof lastName !== "string") {
      return NextResponse.json({ error: "Apellido invalido" }, { status: 400 });
    }
    if (!lastName.trim()) {
      return NextResponse.json({ error: "Apellido requerido" }, { status: 400 });
    }
    data.lastName = lastName.trim();
  }

  if (gender !== undefined) {
    if (typeof gender !== "string") {
      return NextResponse.json({ error: "Genero invalido" }, { status: 400 });
    }
    if (!isValidEnum<Gender>(gender, ["MALE", "FEMALE", "OTHER", "NOT_SPECIFIED"])) {
      return NextResponse.json({ error: "Genero invalido" }, { status: 400 });
    }
    data.gender = gender;
  }

  if (dateOfBirth !== undefined) {
    if (dateOfBirth === null || dateOfBirth === "") {
      data.dateOfBirth = null;
    } else if (typeof dateOfBirth === "string") {
      const parsed = new Date(dateOfBirth);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json(
          { error: "Fecha de nacimiento invalida" },
          { status: 400 }
        );
      }
      data.dateOfBirth = parsed;
    } else {
      return NextResponse.json(
        { error: "Fecha de nacimiento invalida" },
        { status: 400 }
      );
    }
  }

  if (phone !== undefined) data.phone = phone || null;
  if (city !== undefined) data.city = city || null;
  if (country !== undefined) data.country = country || null;
  if (photoUrl !== undefined) data.photoUrl = photoUrl || null;

  try {
    const player =
      Object.keys(data).length === 0
        ? await prisma.player.findUnique({ where: { id } })
        : await prisma.player.update({
            where: { id },
            data,
          });

    if (!player) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ player });
  } catch (error: unknown) {
    const detail =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? error.message
        : undefined;
    const message =
      error instanceof Error && error.message.includes("Unique constraint")
        ? "Ya existe un jugador con ese documento"
        : "No se pudo actualizar el jugador";
    return NextResponse.json(
      detail ? { error: message, detail } : { error: message },
      { status: 400 }
    );
  }
}
