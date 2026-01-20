export default function NotFound() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          Pagina no encontrada
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          La pagina que buscas no existe o fue movida.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/"
            className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-slate-200"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </main>
  );
}
