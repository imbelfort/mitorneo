"use client";

import { Session } from "next-auth";
import SignOutButton from "./sign-out-button";

type Props = {
  session: Session;
};

export default function AccountCard({ session }: Props) {
  const roleLabel =
    session.user?.role === "ADMIN" ? "Administrador" : "Administrador de torneo";

  return (
    <div className="admin-fade-up relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-300/70 via-sky-300/60 to-amber-200/70" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500/90">
            Mi perfil
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-900">
            {session.user?.name ?? "Usuario"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">{session.user?.email}</p>
          <span className="mt-3 inline-flex rounded-full bg-slate-100/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            Rol: {roleLabel}
          </span>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
