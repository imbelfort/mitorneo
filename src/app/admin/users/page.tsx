export const dynamic = "force-dynamic";
export const revalidate = 0;

import UsersManager from "@/components/users/users-manager";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UsersAdminPage() {
  const session = await getServerSession();

  if (!session || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const serializedUsers = users.map((user) => ({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }));

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-slate-50 px-6 py-12"
      suppressHydrationWarning
    >
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
      <div className="relative mx-auto w-full max-w-5xl">
        <section className="admin-fade-up relative overflow-hidden rounded-[32px] bg-white/75 p-10 shadow-[0_35px_80px_-60px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/70 backdrop-blur">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-500/90">
            Panel de administracion
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-900">
            <span className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-600 bg-clip-text text-transparent">
              Usuarios
            </span>
          </h1>
          <p className="mt-3 text-base text-slate-600">
            Gestiona usuarios administradores, roles y contrasenas.
          </p>
          <div className="mt-10">
            <UsersManager initialUsers={serializedUsers} />
          </div>
        </section>
      </div>
    </main>
  );
}

