"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Error inesperado
          </p>
          <h1 className="mt-4 text-3xl font-semibold text-white">
            Algo salio mal
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Intenta recargar la pagina o vuelve al inicio.
          </p>
          {error?.message && (
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
              {error.message}
            </p>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-slate-200"
            >
              Reintentar
            </button>
            <a
              href="/"
              className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:border-white/30"
            >
              Volver al inicio
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
