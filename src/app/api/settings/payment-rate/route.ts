import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const settings =
    (await prisma.globalSetting.findUnique({
      where: { id: "default" },
    })) ??
    (await prisma.globalSetting.create({
      data: { id: "default", paymentRateDefault: 0 },
    }));

  return NextResponse.json({
    paymentRateDefault: settings.paymentRateDefault.toString(),
    paymentQrUrl: settings.paymentQrUrl ?? null,
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const rate = parseRate(
    (body as { paymentRateDefault?: unknown }).paymentRateDefault
  );
  const paymentQrUrl =
    typeof (body as { paymentQrUrl?: unknown }).paymentQrUrl === "string"
      ? (body as { paymentQrUrl?: unknown }).paymentQrUrl.trim() || null
      : null;
  if (rate === null || rate < 0) {
    return NextResponse.json({ error: "Monto invalido" }, { status: 400 });
  }

  const settings = await prisma.globalSetting.upsert({
    where: { id: "default" },
    create: { id: "default", paymentRateDefault: rate, paymentQrUrl },
    update: { paymentRateDefault: rate, paymentQrUrl },
    select: { paymentRateDefault: true, paymentQrUrl: true },
  });

  return NextResponse.json({
    paymentRateDefault: settings.paymentRateDefault.toString(),
    paymentQrUrl: settings.paymentQrUrl ?? null,
  });
}
