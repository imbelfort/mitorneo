import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Trophy,
    Users,
    Layers,
    Dumbbell,
    Settings,
    ArrowRight,
    ShieldCheck
} from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/login");
    }

    // Fetch some quick stats
    const tournamentsCount = await prisma.tournament.count({
        where: session.user.role === "ADMIN" ? {} : { ownerId: session.user.id }
    });

    const playersCount = await prisma.player.count();
    const leaguesCount = await prisma.league.count();

    const recentTournaments = await prisma.tournament.findMany({
        where: session.user.role === "ADMIN" ? {} : { ownerId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
            sport: true,
            _count: {
                select: { registrations: true }
            }
        }
    });

    return (
        <main className="min-h-screen bg-slate-50 p-6 md:p-10">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 flex flex-col gap-2">
                    <h1 className="text-3xl font-bold text-slate-900">
                        Panel de Administración
                    </h1>
                    <p className="text-slate-600">
                        Bienvenido, <span className="font-semibold text-indigo-600">{session.user.name}</span>.
                        Aquí tienes el control de tu ecosistema deportivo.
                    </p>
                </div>

                {/* Quick Stats Grid */}
                <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <Trophy className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Torneos</p>
                                <p className="text-2xl font-bold text-slate-900">{tournamentsCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Jugadores</p>
                                <p className="text-2xl font-bold text-slate-900">{playersCount}</p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:shadow-md">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Ligas</p>
                                <p className="text-2xl font-bold text-slate-900">{leaguesCount}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Tournaments Section */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900">Torneos Recientes</h2>
                        {recentTournaments.length > 0 && (
                            <Link href="/admin/tournaments" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                                Ver todos <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}
                    </div>

                    {recentTournaments.length > 0 ? (
                        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Nombre</th>
                                            <th className="px-6 py-4 font-semibold">Deporte</th>
                                            <th className="px-6 py-4 font-semibold">Estado</th>
                                            <th className="px-6 py-4 font-semibold">Inscritos</th>
                                            <th className="px-6 py-4 font-semibold text-right">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {recentTournaments.map((tournament) => (
                                            <tr key={tournament.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 font-medium text-slate-900">
                                                    {tournament.name}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                                        {tournament.sport?.name ?? "N/A"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tournament.status === 'ACTIVE'
                                                            ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20'
                                                            : tournament.status === 'FINISHED'
                                                                ? 'bg-slate-100 text-slate-600 ring-1 ring-slate-500/20'
                                                                : 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20'
                                                        }`}>
                                                        {tournament.status === 'WAITING' ? 'En espera' :
                                                            tournament.status === 'ACTIVE' ? 'En curso' : 'Finalizado'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="h-4 w-4 text-slate-400" />
                                                        {tournament._count.registrations}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={`/admin/tournaments/${tournament.id}`}
                                                        className="font-medium text-indigo-600 hover:text-indigo-900"
                                                    >
                                                        Gestionar
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                                <Trophy className="h-6 w-6" />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">No tienes torneos activos</h3>
                            <p className="mt-1 text-slate-500">Comienza creando tu primer torneo para gestionarlo desde aquí.</p>
                            <Link
                                href="/admin/tournaments"
                                className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                            >
                                Crear mi primer torneo
                            </Link>
                        </div>
                    )}
                </div>

                {/* Main Navigation Cards */}
                <h2 className="mb-6 text-xl font-bold text-slate-900">Gestión General</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    <Link href="/admin/tournaments" className="group">
                        <div className="h-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-indigo-500/30">
                            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Trophy className="h-7 w-7" />
                            </div>
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">Torneos</h3>
                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                            </div>
                            <p className="text-slate-600">
                                Crea, edita y gestiona tus torneos. Controla fixtures, resultados y categorías.
                            </p>
                        </div>
                    </Link>

                    <Link href="/admin/leagues" className="group">
                        <div className="h-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-blue-500/30">
                            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <ShieldCheck className="h-7 w-7" />
                            </div>
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Ligas</h3>
                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <p className="text-slate-600">
                                Administra ligas y temporadas para agrupar torneos y rankings globales.
                            </p>
                        </div>
                    </Link>

                    <Link href="/admin/players" className="group">
                        <div className="h-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-emerald-500/30">
                            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <Users className="h-7 w-7" />
                            </div>
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Jugadores</h3>
                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                            </div>
                            <p className="text-slate-600">
                                Base de datos centralizada de jugadores, perfiles y estadísticas históricas.
                            </p>
                        </div>
                    </Link>

                    <Link href="/admin/categories" className="group">
                        <div className="h-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-orange-500/30">
                            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                <Layers className="h-7 w-7" />
                            </div>
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors">Categorías</h3>
                                <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-orange-600 transition-colors" />
                            </div>
                            <p className="text-slate-600">
                                Define las categorías estándar (Open, A, B, Seniors, etc.) para usar en tus torneos.
                            </p>
                        </div>
                    </Link>

                    {session.user.role === "ADMIN" && (
                        <Link href="/admin/sports" className="group">
                            <div className="h-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-purple-500/30">
                                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                    <Dumbbell className="h-7 w-7" />
                                </div>
                                <div className="mb-2 flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-purple-600 transition-colors">Deportes</h3>
                                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-purple-600 transition-colors" />
                                </div>
                                <p className="text-slate-600">
                                    Configura los deportes disponibles (Ráquet, Frontón) en la plataforma.
                                </p>
                            </div>
                        </Link>
                    )}

                </div>
            </div>
        </main>
    );
}
