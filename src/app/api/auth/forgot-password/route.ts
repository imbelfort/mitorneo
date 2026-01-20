import { prisma } from "@/lib/prisma";
import { createMailer, mailerEnabled, senderLabel } from "@/lib/mailer";
import crypto from "crypto";
import { NextResponse } from "next/server";

const TOKEN_TTL_MINUTES = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body ?? {};
    const normalizedEmail =
      typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Email requerido" },
        { status: 400 }
      );
    }

    if (!mailerEnabled) {
      return NextResponse.json(
        { error: "SMTP no configurado" },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { email: true, name: true },
    });

    // Always respond with success to avoid account enumeration.
    if (!user) {
      return NextResponse.json({ success: true });
    }

    await prisma.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    });

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        token,
        expiresAt,
      },
    });

    const origin =
      request.headers.get("origin") ??
      process.env.NEXT_PUBLIC_BASE_URL ??
      "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${token}`;

    const transporter = createMailer();
    const nameLabel = user.name ? `Hola ${user.name},` : "Hola,";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <p>${nameLabel}</p>
        <p>Recibimos una solicitud para restablecer tu contrasena.</p>
        <p>
          Haz clic en el siguiente enlace para crear una nueva contrasena:
        </p>
        <p>
          <a href="${resetUrl}" style="color:#4f46e5;">${resetUrl}</a>
        </p>
        <p>Este enlace vence en ${TOKEN_TTL_MINUTES} minutos.</p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
      </div>
    `;

    await transporter.sendMail({
      from: senderLabel,
      to: normalizedEmail,
      subject: "Restablecer contrasena - Mi Torneo",
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error", error);
    return NextResponse.json(
      { error: "No se pudo enviar el correo" },
      { status: 500 }
    );
  }
}