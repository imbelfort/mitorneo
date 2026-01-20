import { getServerSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imagenes" }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "La imagen debe pesar maximo 2MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${crypto.randomUUID()}${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadsDir, filename);

  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.writeFile(filePath, buffer);

  const url = `/uploads/${filename}`;

  return NextResponse.json({ url });
}
