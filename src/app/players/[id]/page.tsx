"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  status: string;
  dateOfBirth: string | null;
  phone: string | null;
  gender: string;
  city: string | null;
  country: string | null;
  photoUrl: string | null;
};

type PlayerStats = {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
};

type LeagueRanking = {
  leagueId: string;
  leagueName: string;
  seasonId: string;
  seasonName: string;
  seasonStart: string;
  seasonEnd: string;
  categoryId: string;
  categoryName: string;
  categoryAbbreviation: string;
  sportId: string | null;
  sportName: string | null;
  points: number;
  position: number | null;
  totalPlayers: number;
};

type ViewState = "loading" | "ready" | "error";

const statusCopy: Record<string, string> = {
  CONFIRMED: "Confirmado",
  UNCONFIRMED: "No confirmado",
};

const genderCopy: Record<string, string> = {
  MALE: "Masculino",
  FEMALE: "Femenino",
  OTHER: "Otro",
  NOT_SPECIFIED: "No especificado",
};

const toISODate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split("T")[0];
};

const calculateAge = (isoDate: string | null) => {
  if (!isoDate) return null;
  const parts = isoDate.split("-").map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [year, month, day] = parts;
  const today = new Date();
  let age = today.getFullYear() - year;
  const monthNow = today.getMonth() + 1;
  const hasBirthdayPassed =
    monthNow > month || (monthNow === month && today.getDate() >= day);
  if (!hasBirthdayPassed) age -= 1;
  return age;
};

export default function PlayerProfilePage() {
  const params = useParams();
  const id = useMemo(() => {
    const raw = params?.id;
    if (Array.isArray(raw)) return raw[0];
    return typeof raw === "string" ? raw : "";
  }, [params]);

  const [state, setState] = useState<ViewState>("loading");
  const [player, setPlayer] = useState<Player | null>(null);
  const [stats, setStats] = useState<PlayerStats>({
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<LeagueRanking[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!id) {
        if (!active) return;
        setState("error");
        setError("Jugador no encontrado");
        return;
      }

      setState("loading");
      setError(null);

      const res = await fetch(`/api/players/${id}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));

      if (!active) return;

      if (!res.ok) {
        setState("error");
        setError(data?.error ?? "Jugador no encontrado");
        return;
      }

      setPlayer(data?.player ?? null);
      if (data?.stats) {
        setStats({
          matchesPlayed: Number(data.stats.matchesPlayed ?? 0),
          matchesWon: Number(data.stats.matchesWon ?? 0),
          matchesLost: Number(data.stats.matchesLost ?? 0),
        });
      } else {
        setStats({ matchesPlayed: 0, matchesWon: 0, matchesLost: 0 });
      }
      setState("ready");
    };

    load();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;

    const loadRankings = async () => {
      if (!id) return;
      setRankingLoading(true);
      const res = await fetch(`/api/players/${id}/ranking`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!active) return;
      setRankingLoading(false);
      if (res.ok && Array.isArray(data.rankings)) {
        setRankings(data.rankings);
      } else {
        setRankings([]);
      }
    };

    loadRankings();

    return () => {
      active = false;
    };
  }, [id]);

  if (state === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
          <p className="text-lg font-semibold text-slate-900">Cargando jugador...</p>
        </div>
      </main>
    );
  }

  if (state === "error" || !player) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
        <div className="rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
          <p className="text-lg font-semibold text-slate-900">
            {error ?? "Jugador no encontrado"}
          </p>
          <Link
            href="/admin/players"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-slate-800"
          >
            Volver
          </Link>
        </div>
      </main>
    );
  }

  const dob = toISODate(player.dateOfBirth);
  const age = calculateAge(dob);
  const genderLabel = genderCopy[player.gender] ?? player.gender;
  const statusLabel = statusCopy[player.status] ?? player.status;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-12">
      <div className="w-full max-w-4xl rounded-3xl bg-white p-10 shadow-lg ring-1 ring-slate-200">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">
              Perfil de jugador
            </p>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              {player.firstName} {player.lastName}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Documento: {player.documentType === "ID_CARD" ? "CI" : "Pasaporte"}{" "}
              {player.documentNumber}
            </p>
            <p className="mt-1 text-sm text-slate-600">Estado: {statusLabel}</p>
          </div>
          <Link
            href="/admin/players"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-slate-800"
          >
            Volver
          </Link>
        </div>

        <div className="mt-8 grid gap-8 sm:grid-cols-[200px_1fr]">
          <div className="flex items-start justify-center">
            <div className="h-48 w-48 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
              {player.photoUrl ? (
                <img
                  src={player.photoUrl}
                  alt="Foto del jugador"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                  Sin foto
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Genero</p>
              <p className="mt-2 text-base font-semibold text-slate-900">{genderLabel}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Fecha nacimiento</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {dob ?? "Sin dato"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Edad</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {age !== null ? `${age} años` : "Sin dato"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Telefono</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {player.phone ?? "Sin dato"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Ubicacion</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {[player.city, player.country].filter(Boolean).join(", ") || "Sin dato"}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Partidos jugados
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {stats.matchesPlayed}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Partidos ganados
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {stats.matchesWon}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Partidos perdidos
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {stats.matchesLost}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Ranking por categoria
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Se calcula por liga, temporada y categoria.
              </p>
            </div>
          </div>

          {rankingLoading ? (
            <p className="mt-3 text-sm text-slate-500">Cargando ranking...</p>
          ) : rankings.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Sin ranking disponible.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {rankings.map((entry) => (
                <div
                  key={`${entry.leagueId}-${entry.seasonId}-${entry.categoryId}`}
                  className="rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {entry.leagueName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Temporada:{" "}
                    <span className="font-semibold text-slate-800">
                      {entry.seasonName}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Categoria:{" "}
                    <span className="font-semibold text-slate-800">
                      {entry.categoryName} ({entry.categoryAbbreviation})
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Ranking:{" "}
                    <span className="font-semibold text-slate-800">
                      {entry.position ?? "-"}
                    </span>{" "}
                    / {entry.totalPlayers}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Puntos:{" "}
                    <span className="font-semibold text-slate-800">
                      {entry.points}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Deporte:{" "}
                    <span className="font-semibold text-slate-800">
                      {entry.sportName ?? "-"}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
