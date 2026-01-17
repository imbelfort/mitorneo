import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { Search, Calendar, MapPin, Trophy } from "lucide-react";
import SearchInput from "@/components/ui/search-input";

const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-BO", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
};

export default async function TournamentsPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const { q } = await searchParams;
    const query = q || "";

    const tournaments = await prisma.tournament.findMany({
        where: {
            name: { contains: query },
        },
        include: {
            sport: true,
            clubs: true,
            league: true,
        },
        orderBy: {
            startDate: "desc",
        },
    });

    return (
        <main className="min-h-screen bg-slate-50 py-12">
            <div className="container mx-auto px-6">
                <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Torneos</h1>
                        <p className="mt-2 text-slate-600">
                            Explora y encuentra tu próxima competencia
                        </p>
                    </div>

                    <SearchInput placeholder="Buscar por nombre..." />
                </div>

                {tournaments.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                        <Trophy className="mb-4 h-12 w-12 text-slate-300" />
                        <h3 className="text-lg font-medium text-slate-900">
                            No se encontraron torneos
                        </h3>
                        <p className="text-slate-500">
                            Intenta con otra búsqueda o regresa más tarde.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {tournaments.map((tournament) => (
                            <Link
                                key={tournament.id}
                                href={`/tournaments/${tournament.id}`}
                                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg hover:-translate-y-1"
                            >
                                <div className="relative h-48 w-full bg-slate-100">
                                    <Image
                                        src={tournament.league?.photoUrl || "/hero/fototres.jpeg"}
                                        alt={tournament.name}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60" />
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <span className="inline-block rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                                            {tournament.sport?.name || "Deporte"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-1 flex-col p-6">
                                    <h3 className="mb-2 text-xl font-bold text-slate-900 line-clamp-2">
                                        {tournament.name}
                                    </h3>

                                    <div className="mt-auto space-y-3 text-sm text-slate-500">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-indigo-500" />
                                            <span>
                                                {tournament.startDate
                                                    ? formatDate(tournament.startDate)
                                                    : "Fecha por definir"}
                                            </span>
                                        </div>
                                        {tournament.clubs.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-4 w-4 text-indigo-500" />
                                                <span className="line-clamp-1">
                                                    {tournament.clubs[0].name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
