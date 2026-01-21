"use client";

import { useMemo, useState } from "react";

type Category = {
  id: string;
  name: string;
  abbreviation: string;
  sport?: { id: string; name: string } | null;
};

type Props = {
  tournamentId: string;
  tournamentName: string;
  initialStartDate: string;
  initialEndDate: string;
  initialRegistrationDeadline: string;
  initialRulesText: string;
  initialPlayDays: string[];
  initialCategoryIds: string[];
  initialCategoryPrices: Record<string, string>;
  categories: Category[];
};

const isDateOnly = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizePlayDays = (value: string[]) => {
  const dates = value.filter((date) => isDateOnly(date));
  return dates.length ? dates : [""];
};

const parsePriceInput = (value?: string) => {
  if (!value) return null;
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePriceInput = (value: string) => value.trim().replace(",", ".");

export default function TournamentStepTwo({
  tournamentId,
  tournamentName,
  initialStartDate,
  initialEndDate,
  initialRegistrationDeadline,
  initialRulesText,
  initialPlayDays,
  initialCategoryIds,
  initialCategoryPrices,
  categories,
}: Props) {
  const [form, setForm] = useState({
    startDate: initialStartDate,
    endDate: initialEndDate,
    registrationDeadline: initialRegistrationDeadline,
    rulesText: initialRulesText,
    playDays: normalizePlayDays(initialPlayDays),
  });
  const [noEndDate, setNoEndDate] = useState(!initialEndDate);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(
    new Set(initialCategoryIds)
  );
  const [categoryPrices, setCategoryPrices] = useState<Record<string, string>>(
    initialCategoryPrices
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!form.startDate || !form.registrationDeadline) return false;
    if (!noEndDate && !form.endDate) return false;
    const validPlayDates = form.playDays.filter((date) => isDateOnly(date));
    if (validPlayDates.length === 0) return false;
    const hasOutOfRange = validPlayDates.some((date) => {
      if (date < form.startDate) return true;
      if (!noEndDate && form.endDate && date > form.endDate) return true;
      return false;
    });
    if (hasOutOfRange) return false;
    if (selectedCategoryIds.size === 0) return false;
    for (const categoryId of selectedCategoryIds) {
      const parsed = parsePriceInput(categoryPrices[categoryId]);
      if (parsed === null || parsed < 0) return false;
    }
    if (!noEndDate && form.endDate < form.startDate) return false;
    return true;
  }, [form, noEndDate, selectedCategoryIds, categoryPrices]);

  const selectedCategories = useMemo(
    () => categories.filter((category) => selectedCategoryIds.has(category.id)),
    [categories, selectedCategoryIds]
  );

  const addPlayDate = () => {
    setForm((prev) => ({ ...prev, playDays: [...prev.playDays, ""] }));
  };

  const updatePlayDate = (index: number, value: string) => {
    setForm((prev) => {
      const playDays = [...prev.playDays];
      playDays[index] = value;
      return { ...prev, playDays };
    });
  };

  const removePlayDate = (index: number) => {
    setForm((prev) => {
      const playDays = prev.playDays.filter((_, idx) => idx !== index);
      return { ...prev, playDays: playDays.length ? playDays : [""] };
    });
  };

  const toggleCategory = (categoryId: string) => {
    const wasSelected = selectedCategoryIds.has(categoryId);
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (wasSelected) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
    setCategoryPrices((prev) => {
      const next = { ...prev };
      if (wasSelected) {
        delete next[categoryId];
      } else if (next[categoryId] === undefined) {
        next[categoryId] = "";
      }
      return next;
    });
  };

  const updateCategoryPrice = (categoryId: string, value: string) => {
    setCategoryPrices((prev) => ({ ...prev, [categoryId]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    const normalizedPlayDays = form.playDays.filter((date) => isDateOnly(date));

    const res = await fetch(`/api/tournaments/${tournamentId}/step-2`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        startDate: form.startDate,
        endDate: noEndDate ? null : form.endDate || null,
        registrationDeadline: form.registrationDeadline,
        rulesText: form.rulesText,
        playDays: normalizedPlayDays,
        categoryEntries: Array.from(selectedCategoryIds).map((categoryId) => ({
          categoryId,
          price: normalizePriceInput(categoryPrices[categoryId] ?? ""),
        })),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      const detail = data?.detail ? ` (${data.detail})` : "";
      setError(`${data?.error ?? "No se pudo guardar el paso 2"}${detail}`);
      return;
    }

    setMessage("Paso 2 guardado.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500">
              Paso 2
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              Fechas y reglas
            </h2>
            <p className="text-sm text-slate-600">
              Torneo: <span className="font-semibold">{tournamentName}</span>
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Fechas y reglas
          </span>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Fecha de inicio
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-slate-700">
                Fecha de fin
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={noEndDate}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setNoEndDate(checked);
                    if (checked) {
                      setForm((prev) => ({ ...prev, endDate: "" }));
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Sin fecha de fin
              </label>
            </div>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => {
                const value = e.target.value;
                setForm((prev) => ({ ...prev, endDate: value }));
                if (value) setNoEndDate(false);
              }}
              disabled={noEndDate}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Cierre de inscripcion
            </label>
            <input
              type="date"
              value={form.registrationDeadline}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, registrationDeadline: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Reglas</label>
            <textarea
              value={form.rulesText}
              onChange={(e) => setForm((prev) => ({ ...prev, rulesText: e.target.value }))}
              className="min-h-[120px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Escribe las reglas del torneo..."
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Fechas de juego</h3>
            <p className="text-sm text-slate-600">
              Agrega las fechas exactas (dia/mes/ano) dentro del rango de inicio y
              fin del torneo.
            </p>
          </div>
          <button
            type="button"
            onClick={addPlayDate}
            className="inline-flex items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            + Agregar fecha
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {form.playDays.map((date, index) => (
            <div key={`play-date-${index}`} className="flex flex-wrap gap-3">
              <input
                type="date"
                value={date}
                onChange={(e) => updatePlayDate(index, e.target.value)}
                min={form.startDate || undefined}
                max={!noEndDate && form.endDate ? form.endDate : undefined}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:max-w-xs"
              />
              {form.playDays.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePlayDate(index)}
                  className="text-xs font-semibold text-red-600 transition hover:text-red-700"
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Categorias</h3>
            <p className="text-sm text-slate-600">
              Selecciona las categorias que se jugaran en este torneo.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {selectedCategoryIds.size} seleccionadas
          </span>
        </div>

        {categories.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Primero crea categorias para poder seleccionarlas.
          </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-[640px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Seleccion</th>
                  <th className="px-3 py-2 text-left font-semibold">Deporte</th>
                  <th className="px-3 py-2 text-left font-semibold">Categoria</th>
                  <th className="px-3 py-2 text-left font-semibold">Abrev.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => {
                  const selected = selectedCategoryIds.has(category.id);
                  return (
                    <tr
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`cursor-pointer transition ${
                        selected ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleCategory(category.id)}
                          onClick={(event) => event.stopPropagation()}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {category.sport?.name ?? "N/D"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900">
                        {category.name}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {category.abbreviation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Precio de inscripcion por categoria
            </h3>
            <p className="text-sm text-slate-600">
              Define el costo de inscripcion para cada categoria seleccionada.
            </p>
          </div>
        </div>

        {selectedCategories.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Selecciona categorias para asignar precios.
          </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-[640px] divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Deporte</th>
                  <th className="px-3 py-2 text-left font-semibold">Categoria</th>
                  <th className="px-3 py-2 text-left font-semibold">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedCategories.map((category) => (
                  <tr key={`price-${category.id}`}>
                    <td className="px-3 py-2 text-slate-700">
                      {category.sport?.name ?? "N/D"}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {category.name}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">
                          Bs
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={categoryPrices[category.id] ?? ""}
                          onChange={(e) =>
                            updateCategoryPrice(category.id, e.target.value)
                          }
                          className="w-full max-w-[140px] rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          placeholder="0.00"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Completa las fechas, reglas, dias, categorias y precios para avanzar.
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Guardando..." : "Guardar paso 2"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      )}
    </div>
  );
}
