"use client";

import { useMemo, useState } from "react";

type Sponsor = {
  id?: string;
  name?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
};

type Club = {
  id: string;
  name: string;
  address?: string | null;
  courtsCount?: number | null;
};

type Category = {
  id: string;
  name: string;
  abbreviation: string;
  sport?: { id: string; name: string } | null;
};

type TournamentCategory = {
  categoryId: string;
  price: string;
  secondaryPrice: string;
  siblingPrice: string;
  category: Category;
};

type Player = {
  id: string;
  firstName: string;
  lastName: string;
};

type Registration = {
  id: string;
  categoryId: string;
  teamName?: string | null;
  player: Player;
  partner?: Player | null;
  partnerTwo?: Player | null;
  createdAt: string;
};

type Match = {
  id: string;
  categoryId: string;
  groupName?: string | null;
  stage: string;
  isBronzeMatch?: boolean | null;
  roundNumber?: number | null;
  scheduledDate?: string | null;
  startTime?: string | null;
  courtNumber?: number | null;
  club?: Club | null;
  games?: unknown;
  winnerSide?: string | null;
  outcomeType?: string | null;
  outcomeSide?: string | null;
  teamA?: Registration | null;
  teamB?: Registration | null;
  category?: Category | null;
};

type Prize = {
  id: string;
  categoryId: string;
  placeFrom: number;
  placeTo?: number | null;
  amount?: string | null;
  prizeText?: string | null;
  category?: Category | null;
};

type TournamentPublicData = {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  registrationDeadline?: string | null;
  rulesText?: string | null;
  playDays: string[];
  sport?: { id: string; name: string } | null;
  league?: { id: string; name: string } | null;
  owner?: { name?: string | null; email?: string | null } | null;
  clubs: Club[];
  sponsors: Sponsor[];
  categories: TournamentCategory[];
  registrations: Registration[];
  matches: Match[];
  prizes: Prize[];
};

type TabKey =
  | "info"
  | "participants"
  | "times"
  | "fixture"
  | "results"
  | "prizes"
  | "contact";

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Info" },
  { key: "participants", label: "Participantes" },
  { key: "times", label: "Tiempos" },
  { key: "fixture", label: "Fixture" },
  { key: "results", label: "Resultados" },
  { key: "prizes", label: "Premios" },
  { key: "contact", label: "Contacto" },
];

const formatDateLong = (value?: string | null) => {
  if (!value) return "N/D";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-BO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateShort = (value?: string | null) => {
  if (!value) return "N/D";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatMatchScore = (match: Match) => {
  if (!Array.isArray(match.games)) return null;
  const parts: string[] = [];
  for (const entry of match.games) {
    if (!entry || typeof entry !== "object") continue;
    const a = (entry as { a?: unknown }).a;
    const b = (entry as { b?: unknown }).b;
    if (typeof a !== "number" || typeof b !== "number") continue;
    parts.push(`${a}-${b}`);
  }
  return parts.length ? parts.join(" | ") : null;
};

const playerLabel = (player?: Player | null) =>
  player ? `${player.firstName} ${player.lastName}` : "Por definir";

const teamLabel = (registration?: Registration | null) => {
  if (!registration) return "Por definir";
  if (registration.teamName) return registration.teamName;
  const names = [
    registration.player,
    registration.partner,
    registration.partnerTwo,
  ]
    .filter(Boolean)
    .map((p) => playerLabel(p as Player));
  return names.join(" / ");
};

export default function TournamentPublic({
  tournament,
}: {
  tournament: TournamentPublicData;
}) {
  const [tab, setTab] = useState<TabKey>("info");

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>();
    tournament.categories.forEach((entry) => {
      map.set(entry.categoryId, entry.category);
    });
    return map;
  }, [tournament.categories]);

  const registrationsByCategory = useMemo(() => {
    const map = new Map<string, Registration[]>();
    tournament.registrations.forEach((registration) => {
      const list = map.get(registration.categoryId) ?? [];
      list.push(registration);
      map.set(registration.categoryId, list);
    });
    return map;
  }, [tournament.registrations]);

  const matchesByDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    tournament.matches.forEach((match) => {
      const dateKey = match.scheduledDate
        ? match.scheduledDate.split("T")[0]
        : "sin-fecha";
      const list = map.get(dateKey) ?? [];
      list.push(match);
      map.set(dateKey, list);
    });
    return map;
  }, [tournament.matches]);

  const resultMatches = useMemo(
    () =>
      tournament.matches.filter((match) => {
        const score = formatMatchScore(match);
        return Boolean(
          score ||
            match.winnerSide ||
            (match.outcomeType && match.outcomeType !== "PLAYED")
        );
      }),
    [tournament.matches]
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(1200px_circle_at_10%_20%,rgba(59,130,246,0.25),transparent_55%),radial-gradient(900px_circle_at_90%_0%,rgba(14,165,233,0.25),transparent_50%)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
                Torneo
              </p>
              <h1
                className="mt-3 text-4xl font-semibold text-white"
                style={{ fontFamily: "'Merriweather', serif" }}
              >
                {tournament.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-200/80">
                {tournament.description ||
                  "Informacion oficial del torneo y detalles para los jugadores."}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200">
              <p className="font-semibold text-white">
                {tournament.league?.name ?? "Sin liga"}
              </p>
              <p className="mt-1 text-slate-300">
                {tournament.sport?.name ?? "Sin deporte"}
              </p>
              <p className="mt-1 text-slate-300">
                Inicio: {formatDateShort(tournament.startDate)}
              </p>
            </div>
          </div>

          {tournament.sponsors.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              {tournament.sponsors.map((sponsor, index) => {
                const content = (
                  <div className="flex h-14 w-32 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                    <img
                      src={sponsor.imageUrl}
                      alt={sponsor.name ?? `Auspiciador ${index + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                );
                if (sponsor.linkUrl) {
                  return (
                    <a
                      key={`${sponsor.imageUrl}-${index}`}
                      href={sponsor.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {content}
                    </a>
                  );
                }
                return (
                  <div key={`${sponsor.imageUrl}-${index}`}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${
                tab === item.key
                  ? "bg-cyan-400/90 text-slate-900"
                  : "border border-white/10 bg-white/5 text-slate-200/80"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Reglas</h2>
              {tournament.rulesText ? (
                <div
                  className="prose prose-invert mt-4 max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: tournament.rulesText }}
                />
              ) : (
                <p className="mt-4 text-sm text-slate-300">
                  Sin reglas publicadas.
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">
                Categorias disponibles
              </h2>
              <div className="mt-4 space-y-3 text-sm">
                {tournament.categories.map((entry) => (
                  <div
                    key={entry.categoryId}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-white">
                        {entry.category.name}
                      </p>
                      <p className="text-xs text-slate-300">
                        {entry.category.abbreviation} ·{" "}
                        {entry.category.sport?.name ?? "N/D"}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-300">
                      <p>Precio 1: Bs {entry.price}</p>
                      <p>Precio 2+: Bs {entry.secondaryPrice || entry.price}</p>
                      <p>Precio hermano: Bs {entry.siblingPrice || entry.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "participants" && (
          <section className="mt-8 space-y-6">
            {tournament.categories.map((entry) => {
              const list = registrationsByCategory.get(entry.categoryId) ?? [];
              return (
                <div
                  key={`participants-${entry.categoryId}`}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {entry.category.name}
                      </h3>
                      <p className="text-xs text-slate-300">
                        {entry.category.abbreviation} · {list.length} inscritos
                      </p>
                    </div>
                  </div>
                  {list.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-300">
                      Sin inscritos.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {list.map((registration) => (
                        <div
                          key={registration.id}
                          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm"
                        >
                          <p className="font-semibold text-white">
                            {teamLabel(registration)}
                          </p>
                          <p className="mt-1 text-xs text-slate-300">
                            Inscrito: {formatDateShort(registration.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {tab === "times" && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Fechas clave</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p>Inicio: {formatDateLong(tournament.startDate)}</p>
                <p>Fin: {formatDateLong(tournament.endDate)}</p>
                <p>
                  Cierre inscripciones:{" "}
                  {formatDateLong(tournament.registrationDeadline)}
                </p>
                <div>
                  <p className="mt-4 font-semibold text-white">Dias de juego</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tournament.playDays.map((day) => (
                      <span
                        key={day}
                        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200"
                      >
                        {formatDateShort(day)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Sedes</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {tournament.clubs.map((club) => (
                  <div
                    key={club.id}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"
                  >
                    <p className="font-semibold text-white">{club.name}</p>
                    <p>{club.address ?? "Sin direccion"}</p>
                    <p className="text-xs text-slate-300">
                      Canchas habilitadas: {club.courtsCount ?? 1}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === "fixture" && (
          <section className="mt-8 space-y-6">
            {Array.from(matchesByDate.entries()).map(([dateKey, matches]) => (
              <div
                key={`fixture-${dateKey}`}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <h3 className="text-lg font-semibold text-white">
                  {dateKey === "sin-fecha"
                    ? "Sin fecha asignada"
                    : formatDateLong(dateKey)}
                </h3>
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <table className="min-w-full text-xs text-slate-200">
                    <thead className="bg-white/10 uppercase tracking-[0.2em] text-slate-300">
                      <tr>
                        <th className="px-3 py-2 text-left">Hora</th>
                        <th className="px-3 py-2 text-left">Club</th>
                        <th className="px-3 py-2 text-left">Cancha</th>
                        <th className="px-3 py-2 text-left">Categoria</th>
                        <th className="px-3 py-2 text-left">Grupo</th>
                        <th className="px-3 py-2 text-left">Equipo 1</th>
                        <th className="px-3 py-2 text-left">VS</th>
                        <th className="px-3 py-2 text-left">Equipo 2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {matches.map((match) => {
                        const category =
                          match.category ?? categoriesById.get(match.categoryId);
                        return (
                          <tr key={match.id} className="bg-white/5">
                            <td className="px-3 py-2">
                              {match.startTime ?? "N/D"}
                            </td>
                            <td className="px-3 py-2">
                              {match.club?.name ?? "N/D"}
                            </td>
                            <td className="px-3 py-2">
                              {match.courtNumber ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {category?.abbreviation ?? "N/D"}
                            </td>
                            <td className="px-3 py-2">
                              {match.stage === "PLAYOFF"
                                ? match.isBronzeMatch
                                  ? "Bronce"
                                  : "Playoff"
                                : match.groupName ?? "-"}
                            </td>
                            <td className="px-3 py-2 font-semibold text-white">
                              {teamLabel(match.teamA)}
                            </td>
                            <td className="px-3 py-2 text-slate-400">vs</td>
                            <td className="px-3 py-2 font-semibold text-white">
                              {teamLabel(match.teamB)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "results" && (
          <section className="mt-8 space-y-6">
            {resultMatches.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                Aun no hay resultados registrados.
              </div>
            ) : (
              resultMatches.map((match) => {
                const category =
                  match.category ?? categoriesById.get(match.categoryId);
                const score = formatMatchScore(match);
                return (
                  <div
                    key={`result-${match.id}`}
                    className="rounded-3xl border border-white/10 bg-white/5 p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          {category?.name ?? "Categoria"}
                        </p>
                        <p className="mt-2 text-base font-semibold text-white">
                          {teamLabel(match.teamA)}{" "}
                          <span className="text-slate-400">vs</span>{" "}
                          {teamLabel(match.teamB)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-300">
                        <p>{match.startTime ?? "N/D"}</p>
                        <p>{formatDateShort(match.scheduledDate)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                        Marcador: {score ?? "N/D"}
                      </span>
                      {match.outcomeType && match.outcomeType !== "PLAYED" && (
                        <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs text-amber-200">
                          {match.outcomeType === "WALKOVER"
                            ? "Walkover"
                            : "Lesion"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {tab === "prizes" && (
          <section className="mt-8 space-y-6">
            {tournament.prizes.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                Premios por definir.
              </div>
            ) : (
              tournament.prizes.map((prize) => (
                <div
                  key={prize.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {prize.category?.name ?? "Categoria"}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">
                    Puesto {prize.placeFrom}
                    {prize.placeTo ? ` - ${prize.placeTo}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {prize.amount ? `Bs ${prize.amount}` : prize.prizeText ?? "-"}
                  </p>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "contact" && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Contacto</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p>Organiza: {tournament.league?.name ?? "N/D"}</p>
                <p>
                  Responsable: {tournament.owner?.name ?? "Sin nombre"}
                </p>
                <p>Correo: {tournament.owner?.email ?? "Sin correo"}</p>
                <p>Direccion: {tournament.address ?? "Sin direccion"}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Ubicacion</h2>
              <p className="mt-4 text-sm text-slate-300">
                Consulta las sedes y horarios en la pestaña de tiempos.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
