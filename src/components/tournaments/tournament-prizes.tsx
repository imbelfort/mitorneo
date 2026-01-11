"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CategoryModality = "SINGLES" | "DOUBLES";
type CategoryGender = "MALE" | "FEMALE" | "MIXED";

type Category = {
  id: string;
  name: string;
  abbreviation: string;
  modality?: CategoryModality | null;
  gender?: CategoryGender | null;
  sport?: { id: string; name: string } | null;
};

type PrizeEntry = {
  id: string;
  categoryId: string;
  placeFrom: string;
  placeTo: string;
  openEnded: boolean;
  amount: string;
  prizeText: string;
};

type PrizeResponse = {
  id: string;
  categoryId: string;
  placeFrom: number;
  placeTo: number | null;
  amount: string | number | null;
  prizeText: string | null;
};

type RankingPointsEntry = {
  id: string;
  placeFrom: string;
  placeTo: string;
  openEnded: boolean;
  points: string;
};

type RankingPointsResponse = {
  id: string;
  placeFrom: number;
  placeTo: number | null;
  points: number;
};

type Props = {
  tournamentId: string;
  tournamentName: string;
  categories: Category[];
};

const parsePlaceInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
};

const parsePriceInput = (value?: string) => {
  if (!value) return null;
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePointsInput = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

const normalizePriceInput = (value: string) => value.trim().replace(",", ".");

const formatPriceInput = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? value.toString() : "";
  return value;
};

export default function TournamentPrizes({
  tournamentId,
  tournamentName,
  categories,
}: Props) {
  const entryCounter = useRef(1);
  const rankingEntryCounter = useRef(1);
  const [entries, setEntries] = useState<PrizeEntry[]>([]);
  const [rankingEntries, setRankingEntries] = useState<RankingPointsEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRanking, setSavingRanking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  useEffect(() => {
    const allowedIds = new Set(categories.map((category) => category.id));
    setEntries((prev) => prev.filter((entry) => allowedIds.has(entry.categoryId)));
  }, [categories]);

  useEffect(() => {
    let active = true;
    const loadPrizes = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/prizes`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok && Array.isArray(data.prizes)) {
          const allowedIds = new Set(categories.map((category) => category.id));
          const mapped = (data.prizes as PrizeResponse[])
            .filter((prize) => allowedIds.has(prize.categoryId))
            .map((prize) => ({
              id: prize.id,
              categoryId: prize.categoryId,
              placeFrom: String(prize.placeFrom),
              placeTo: prize.placeTo ? String(prize.placeTo) : "",
              openEnded: prize.placeTo === null,
              amount: formatPriceInput(prize.amount),
              prizeText: prize.prizeText ?? "",
            }));
          entryCounter.current = mapped.length + 1;
          setEntries(mapped);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadPrizes();

    return () => {
      active = false;
    };
  }, [tournamentId, categories]);

  useEffect(() => {
    let active = true;
    const loadRankingPoints = async () => {
      setLoadingRanking(true);
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/ranking-points`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (res.ok && Array.isArray(data.points)) {
          const mapped = (data.points as RankingPointsResponse[]).map((entry) => ({
            id: entry.id,
            placeFrom: String(entry.placeFrom),
            placeTo: entry.placeTo ? String(entry.placeTo) : "",
            openEnded: entry.placeTo === null,
            points: String(entry.points),
          }));
          rankingEntryCounter.current = mapped.length + 1;
          setRankingEntries(mapped);
        }
      } finally {
        if (active) setLoadingRanking(false);
      }
    };

    loadRankingPoints();

    return () => {
      active = false;
    };
  }, [tournamentId]);

  const entriesByCategory = useMemo(() => {
    const map = new Map<string, PrizeEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.categoryId) ?? [];
      list.push(entry);
      map.set(entry.categoryId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const aFrom = parsePlaceInput(a.placeFrom) ?? Number.MAX_SAFE_INTEGER;
        const bFrom = parsePlaceInput(b.placeFrom) ?? Number.MAX_SAFE_INTEGER;
        return aFrom - bFrom;
      });
    }
    return map;
  }, [entries]);

  const createEntry = (categoryId: string): PrizeEntry => {
    const entryId = `prize-${entryCounter.current}`;
    entryCounter.current += 1;
    return {
      id: entryId,
      categoryId,
      placeFrom: "",
      placeTo: "",
      openEnded: false,
      amount: "",
      prizeText: "",
    };
  };

  const createRankingEntry = (): RankingPointsEntry => {
    const entryId = `ranking-${rankingEntryCounter.current}`;
    rankingEntryCounter.current += 1;
    return {
      id: entryId,
      placeFrom: "",
      placeTo: "",
      openEnded: false,
      points: "",
    };
  };

  const addEntry = (categoryId: string) => {
    setEntries((prev) => [...prev, createEntry(categoryId)]);
  };

  const addRankingEntry = () => {
    setRankingEntries((prev) => [...prev, createRankingEntry()]);
  };

  const removeEntry = (entryId: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const removeRankingEntry = (entryId: string) => {
    setRankingEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const updateEntry = (entryId: string, updates: Partial<PrizeEntry>) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, ...updates } : entry))
    );
  };

  const updateRankingEntry = (
    entryId: string,
    updates: Partial<RankingPointsEntry>
  ) => {
    setRankingEntries((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, ...updates } : entry))
    );
  };

  const handleSaveRanking = async () => {
    setError(null);
    setMessage(null);

    for (const entry of rankingEntries) {
      const placeFrom = parsePlaceInput(entry.placeFrom);
      if (placeFrom === null) {
        setError("El lugar inicial es invalido");
        return;
      }
      if (!entry.openEnded) {
        const placeToValue = entry.placeTo.trim() || entry.placeFrom;
        const placeTo = parsePlaceInput(placeToValue);
        if (placeTo === null) {
          setError("El lugar final es invalido");
          return;
        }
        if (placeTo < placeFrom) {
          setError("El lugar final debe ser mayor o igual al inicial");
          return;
        }
      }
      const points = parsePointsInput(entry.points);
      if (points === null) {
        setError("Los puntos son invalidos");
        return;
      }
    }

    setSavingRanking(true);
    const payload = {
      entries: rankingEntries.map((entry) => ({
        placeFrom: entry.placeFrom,
        placeTo: entry.openEnded ? null : entry.placeTo,
        points: entry.points.trim(),
      })),
    };

    const res = await fetch(`/api/tournaments/${tournamentId}/ranking-points`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setSavingRanking(false);

    if (!res.ok) {
      const detail = data?.detail ? ` (${data.detail})` : "";
      setError(`${data?.error ?? "No se pudieron guardar los puntos"}${detail}`);
      return;
    }

    if (Array.isArray(data.points)) {
      const mapped = (data.points as RankingPointsResponse[]).map((entry) => ({
        id: entry.id,
        placeFrom: String(entry.placeFrom),
        placeTo: entry.placeTo ? String(entry.placeTo) : "",
        openEnded: entry.placeTo === null,
        points: String(entry.points),
      }));
      setRankingEntries(mapped);
    }

    setMessage("Puntos guardados");
  };

  const handleSave = async () => {
    setError(null);
    setMessage(null);

    for (const entry of entries) {
      if (!categoriesById.has(entry.categoryId)) {
        setError("Selecciona una categoria valida");
        return;
      }
      const placeFrom = parsePlaceInput(entry.placeFrom);
      if (placeFrom === null) {
        setError("El lugar inicial es invalido");
        return;
      }
      if (!entry.openEnded) {
        const placeToValue = entry.placeTo.trim() || entry.placeFrom;
        const placeTo = parsePlaceInput(placeToValue);
        if (placeTo === null) {
          setError("El lugar final es invalido");
          return;
        }
        if (placeTo < placeFrom) {
          setError("El lugar final debe ser mayor o igual al inicial");
          return;
        }
      }
      if (entry.amount.trim().length > 0) {
        const parsed = parsePriceInput(entry.amount);
        if (parsed === null || parsed < 0) {
          setError("El monto de premio es invalido");
          return;
        }
      }
      if (!entry.amount.trim() && !entry.prizeText.trim()) {
        setError("Debes ingresar un monto o detalle de premio");
        return;
      }
    }

    setSaving(true);
    const payload = {
      entries: entries.map((entry) => ({
        categoryId: entry.categoryId,
        placeFrom: entry.placeFrom,
        placeTo: entry.openEnded ? null : entry.placeTo,
        amount: entry.amount.trim() ? normalizePriceInput(entry.amount) : null,
        prizeText: entry.prizeText.trim() || null,
      })),
    };

    const res = await fetch(`/api/tournaments/${tournamentId}/prizes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      const detail = data?.detail ? ` (${data.detail})` : "";
      setError(`${data?.error ?? "No se pudieron guardar los premios"}${detail}`);
      return;
    }

    if (Array.isArray(data.prizes)) {
      const allowedIds = new Set(categories.map((category) => category.id));
      const mapped = (data.prizes as PrizeResponse[])
        .filter((prize) => allowedIds.has(prize.categoryId))
        .map((prize) => ({
          id: prize.id,
          categoryId: prize.categoryId,
          placeFrom: String(prize.placeFrom),
          placeTo: prize.placeTo ? String(prize.placeTo) : "",
          openEnded: prize.placeTo === null,
          amount: formatPriceInput(prize.amount),
          prizeText: prize.prizeText ?? "",
        }));
      setEntries(mapped);
    }

    setMessage("Premios guardados");
  };

  return (
    <div className="space-y-6">
      <div className="admin-fade-up relative overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-300/70 via-sky-300/60 to-amber-200/70" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500">
              Paso 3
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Premios por categoria
            </h2>
            <p className="text-sm text-slate-600">
              Torneo: <span className="font-semibold">{tournamentName}</span>
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Premios
          </span>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Define los lugares y los premios por categoria. Puedes dejar el monto en
          blanco si el premio es solo medalla o reconocimiento.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.25)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Puntos para ranking</h3>
            <p className="text-sm text-slate-600">
              Estos puntos aplican a todas las categorias del torneo.
            </p>
          </div>
          <button
            type="button"
            onClick={addRankingEntry}
            className="inline-flex items-center justify-center rounded-full border border-indigo-200/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700 shadow-sm transition hover:bg-indigo-50"
          >
            + Agregar rango
          </button>
        </div>

        {loadingRanking ? (
          <p className="mt-3 text-sm text-slate-500">Cargando puntos...</p>
        ) : rankingEntries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Sin puntos configurados.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {rankingEntries.map((entry, index) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Rango {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeRankingEntry(entry.id)}
                    className="text-xs font-semibold text-red-600 transition hover:text-red-700"
                  >
                    Quitar
                  </button>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Lugar desde
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={entry.placeFrom}
                      onChange={(e) =>
                        updateRankingEntry(entry.id, { placeFrom: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-slate-700">
                        Lugar hasta
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={entry.openEnded}
                          onChange={(e) =>
                            updateRankingEntry(entry.id, {
                              openEnded: e.target.checked,
                              placeTo: e.target.checked ? "" : entry.placeTo,
                            })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Hasta el ultimo lugar
                      </label>
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={entry.placeTo}
                      onChange={(e) =>
                        updateRankingEntry(entry.id, { placeTo: e.target.value })
                      }
                      disabled={entry.openEnded}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                      placeholder={entry.openEnded ? "Ultimo" : "2"}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Puntos
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={entry.points}
                      onChange={(e) =>
                        updateRankingEntry(entry.id, { points: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Guarda los puntos para el ranking del torneo.
        </p>
        <button
          type="button"
          onClick={handleSaveRanking}
          disabled={savingRanking}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.5)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {savingRanking ? "Guardando..." : "Guardar puntos"}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando premios...</p>
      ) : categories.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          No hay categorias seleccionadas para premiar.
        </p>
      ) : (
        <div className="space-y-5">
          {categories.map((category) => {
            const list = entriesByCategory.get(category.id) ?? [];
            return (
              <div
                key={category.id}
                className="rounded-2xl border border-slate-200/70 bg-white/80 p-5 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.25)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {category.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {category.abbreviation} - {category.sport?.name ?? "N/D"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addEntry(category.id)}
                    className="inline-flex items-center justify-center rounded-full border border-indigo-200/80 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                  >
                    + Agregar premio
                  </button>
                </div>

                {list.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">
                    Sin premios definidos en esta categoria.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {list.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            Premio {index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            className="text-xs font-semibold text-red-600 transition hover:text-red-700"
                          >
                            Quitar
                          </button>
                        </div>
                        <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_1.6fr]">
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              Lugar desde
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={entry.placeFrom}
                              onChange={(e) =>
                                updateEntry(entry.id, { placeFrom: e.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              placeholder="1"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                              <label className="text-sm font-medium text-slate-700">
                                Lugar hasta
                              </label>
                              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={entry.openEnded}
                                  onChange={(e) =>
                                    updateEntry(entry.id, {
                                      openEnded: e.target.checked,
                                      placeTo: e.target.checked ? "" : entry.placeTo,
                                    })
                                  }
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Hasta el ultimo lugar
                              </label>
                            </div>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={entry.placeTo}
                              onChange={(e) =>
                                updateEntry(entry.id, { placeTo: e.target.value })
                              }
                              disabled={entry.openEnded}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                              placeholder={entry.openEnded ? "Ultimo" : "2"}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              Monto (Bs)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={entry.amount}
                              onChange={(e) =>
                                updateEntry(entry.id, { amount: e.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">
                              Premio / detalle
                            </label>
                            <input
                              value={entry.prizeText}
                              onChange={(e) =>
                                updateEntry(entry.id, { prizeText: e.target.value })
                              }
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                              placeholder="Ej. Medalla, trofeo, regalo"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Guarda los premios para que queden ligados al torneo.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(15,23,42,0.5)] transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? "Guardando..." : "Guardar premios"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      )}
    </div>
  );
}
