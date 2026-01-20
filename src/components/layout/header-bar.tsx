"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "./theme-toggle";

export default function HeaderBar() {
  const { data: session, status } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  const roleLabel =
    session?.user?.role === "ADMIN"
      ? "Administrador"
      : "Administrador de torneo";

  if (pathname == "/") {
    return (
      <header className="sticky top-0 z-40 bg-[var(--surface)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/logo/logo1.png"
              alt="Mi Torneo"
              width={180}
              height={54}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle className="border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface)]" />
            {status === "loading" ? (
              <span className="text-xs text-slate-400">Cargando...</span>
            ) : session ? (
              <>
                <span className="hidden rounded-full bg-[var(--surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 md:inline-flex">
                  {roleLabel}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-foreground)] shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loggingOut ? "Saliendo..." : "Cerrar sesion"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--foreground)] transition hover:bg-[var(--surface)]"
                >
                  Iniciar sesion
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-foreground)] shadow-sm transition hover:opacity-90"
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

  const showBackButton = pathname !== "/" && pathname !== "/admin";

  const handleBack = () => {
    if (pathname === "/login" || pathname === "/register") {
      router.push("/");
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <button
              onClick={handleBack}
              className="group flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900"
              aria-label="Volver atrás"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            </button>
          )}
          <Link href="/">
            <Image
              src="/logo/logo1.png"
              alt="Mi Torneo"
              width={200}
              height={60}
              className="h-14 w-auto object-contain"
              priority
            />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle className="border-[var(--border)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface)]" />
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
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 sm:px-4"
              >
                <span className="sm:hidden">Salir</span>
                <span className="hidden sm:inline">{loggingOut ? "Saliendo..." : "Cerrar sesion"}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 shadow-sm transition hover:bg-slate-50 sm:px-4"
              >
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Iniciar sesion</span>
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-indigo-700 sm:px-4"
              >
                <span className="sm:hidden">Crear</span>
                <span className="hidden sm:inline">Crear cuenta</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
