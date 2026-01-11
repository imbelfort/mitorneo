"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function HeaderBar() {
  const { data: session, status } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  const roleLabel =
    session?.user?.role === "ADMIN"
      ? "Administrador"
      : "Administrador de torneo";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <Link
          href="/"
          className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-600 transition hover:text-indigo-700"
        >
          Mi Torneo
        </Link>
        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <span className="text-xs text-slate-500">Cargando...</span>
          ) : session ? (
            <>
              <div className="hidden flex-col text-right sm:flex">
                <span className="text-xs font-semibold text-slate-700">
                  {session.user?.name ?? "Usuario"}
                </span>
                <span className="text-[11px] text-slate-500">
                  {session.user?.email}
                </span>
              </div>
              <span className="hidden rounded-full bg-slate-100/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 md:inline-flex">
                {roleLabel}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={loggingOut}
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loggingOut ? "Saliendo..." : "Cerrar sesion"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Iniciar sesion
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-indigo-700"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
