import AuthPanel from "@/components/auth/auth-panel";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const hasSession = Boolean(session);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-6 py-12" suppressHydrationWarning>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_10%_10%,rgba(99,102,241,0.18),transparent_60%),radial-gradient(900px_circle_at_90%_0%,rgba(14,165,233,0.16),transparent_55%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] bg-[size:64px_64px] opacity-30 [mask-image:radial-gradient(circle_at_top,black,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-120px] h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl admin-glow"
      />
      <div
        className={`relative mx-auto w-full ${
          hasSession
            ? "max-w-5xl"
            : "grid max-w-6xl gap-8 lg:grid-cols-[1.25fr_0.75fr]"
        }`}
      >
        <section className="admin-fade-up relative overflow-hidden rounded-[32px] bg-white/75 p-10 shadow-[0_35px_80px_-60px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/70 backdrop-blur">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500/90">
            Crea tu torneo
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-900">
            <span className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-600 bg-clip-text text-transparent">
              Una pagina sencilla, puro texto y lista para empezar tu torneo.
            </span>
          </h1>
          <p className="mt-4 text-base text-slate-600">
            Explica aqui de que trata tu torneo, reglas basicas, calendario o lo
            que necesites. Esta seccion es solo texto, sin formularios ni
            distracciones, para que cuentes la historia de tu evento como
            quieras. Cualquiera puede leer esto sin iniciar sesion.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.2)]">
              <p className="text-sm font-semibold text-slate-800">
                Comparte tu idea
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Describe el formato, premios y como participar. Es tu lienzo de
                texto.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.2)]">
              <p className="text-sm font-semibold text-slate-800">
                Listo para registrar
              </p>
              <p className="mt-1 text-sm text-slate-600">
                A un lado tienes el acceso para crear cuenta o iniciar sesion y
                gestionar tu torneo como administrador de torneo o administrador
                general.
              </p>
            </div>
          </div>
          {session?.user.role && (
            <div className="mt-8 rounded-2xl border border-indigo-200/70 bg-indigo-50/70 px-4 py-3 text-sm text-indigo-900 shadow-[0_12px_30px_-24px_rgba(99,102,241,0.35)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Panel de administrador</p>
                  <p className="text-indigo-800/80">
                    Accede a la gestion de ligas, categorias, deportes y jugadores.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(session.user.role === "ADMIN" ||
                    session.user.role === "TOURNAMENT_ADMIN") && (
                    <Link
                      href="/admin/tournaments"
                      className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                    >
                      Crear torneo
                    </Link>
                  )}
                  {(session.user.role === "ADMIN" ||
                    session.user.role === "TOURNAMENT_ADMIN") && (
                    <Link
                      href="/admin/leagues"
                      className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                      Ligas
                    </Link>
                  )}
                  {(session.user.role === "ADMIN" ||
                    session.user.role === "TOURNAMENT_ADMIN") && (
                    <Link
                      href="/admin/categories"
                      className="inline-flex items-center justify-center rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-indigo-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    >
                      Categorias
                    </Link>
                  )}
                  {(session.user.role === "ADMIN" ||
                    session.user.role === "TOURNAMENT_ADMIN") && (
                    <Link
                      href="/admin/players"
                      className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                    >
                      Jugadores
                    </Link>
                  )}
                  {session.user.role === "ADMIN" && (
                    <Link
                      href="/admin/sports"
                      className="inline-flex items-center justify-center rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                    >
                      Deportes
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
          <p className="mt-8 text-sm text-slate-500">
            Usuario demo listo: demo@example.com / password123
          </p>
        </section>

        {!hasSession && (
          <div className="admin-fade-up">
            <AuthPanel session={session} />
          </div>
        )}
      </div>
    </main>
  );
}
