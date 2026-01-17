import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "465");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME ?? "Mi Torneo";
const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL ?? SMTP_USER;

export const mailerEnabled = Boolean(
  SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM_EMAIL
);

export const createMailer = () => {
  if (!mailerEnabled) {
    throw new Error("SMTP no configurado");
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

export const senderLabel = SMTP_FROM_EMAIL
  ? `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`
  : SMTP_FROM_NAME;
