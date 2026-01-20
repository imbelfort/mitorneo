export const dynamic = "force-dynamic";
export const revalidate = 0;

import CategoriesManager from "@/components/categories/categories-manager";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CategoriesAdminPage() {
  const session = await getServerSession();
  const hasSession = Boolean(session);

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    redirect("/");
  }

  const sports = await prisma.sport.findMany({
    orderBy: { name: "asc" },
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { sport: { select: { id: true, name: true } } },
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-6 py-12">
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
      {hasSession && (
        <div className="admin-fade-up absolute right-6 top-6 hidden items-center gap-2 rounded-full border border-slate-200/70 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400 shadow-sm sm:flex">
          Sesion activa
        </div>
      )}
      <div className="relative mx-auto w-full max-w-5xl">
        <section className="admin-fade-up relative overflow-hidden rounded-[32px] bg-white/75 p-10 shadow-[0_35px_80px_-60px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/70 backdrop-blur">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500/90">
            Panel de administracion
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-900">
            <span className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-600 bg-clip-text text-transparent">
              Categorias por deporte
            </span>
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Registra categorias que luego podran usarse en los torneos.
          </p>
          <div className="mt-10">
            <CategoriesManager
              sports={sports}
              initialCategories={categories}
              canEdit
              currentUserId={session.user.id}
              currentUserRole={session.user.role}
            />
          </div>
        </section>
      </div>
    </main>
  );
}


