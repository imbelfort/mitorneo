"use client";

import { useMemo, useState } from "react";

type Sport = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  abbreviation: string;
  sportId: string;
  modality?: "SINGLES" | "DOUBLES" | null;
  gender?: "MALE" | "FEMALE" | "MIXED" | null;
  sport?: Sport | null;
};

type Props = {
  sports: Sport[];
  initialCategories: Category[];
};

const sortCategories = (list: Category[], sportNameById: Map<string, string>) =>
  [...list].sort((a, b) => {
    const sportA = a.sport?.name ?? sportNameById.get(a.sportId) ?? "";
    const sportB = b.sport?.name ?? sportNameById.get(b.sportId) ?? "";
    const sportCompare = sportA.localeCompare(sportB);
    if (sportCompare !== 0) return sportCompare;
    return a.name.localeCompare(b.name);
  });

export default function CategoriesManager({ sports, initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [form, setForm] = useState({
    sportId: sports[0]?.id ?? "",
    name: "",
    abbreviation: "",
    modality: "",
    gender: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const sportNameById = useMemo(
    () => new Map(sports.map((sport) => [sport.id, sport.name])),
    [sports]
  );

  const isRacquetballName = (name: string | null | undefined) => {
    if (!name) return false;
    const normalized = name.toLowerCase().replace(/\s+/g, "");
    return normalized === "racquetball" || normalized === "raquetball";
  };

  const isRacquetballSport = (sportId: string) =>
    isRacquetballName(sportNameById.get(sportId));

  const resetForm = () => {
    const sportId = sports[0]?.id ?? "";
    const racquetball = isRacquetballSport(sportId);
    setForm({
      sportId,
      name: "",
      abbreviation: "",
      modality: racquetball ? "SINGLES" : "",
      gender: racquetball ? "MALE" : "",
    });
  };

  const handleSportChange = (sportId: string) => {
    setForm((prev) => {
      const racquetball = isRacquetballSport(sportId);
      if (!racquetball) {
        return { ...prev, sportId, modality: "", gender: "" };
      }
      return {
        ...prev,
        sportId,
        modality: prev.modality || "SINGLES",
        gender: prev.gender || "MALE",
      };
    });
  };

  const isRacquetballSelected = isRacquetballSport(form.sportId);

  const saveCategory = async () => {
    if (!form.sportId) {
      setError("Selecciona un deporte");
      return;
    }

    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch(editingId ? `/api/categories/${editingId}` : "/api/categories", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sportId: form.sportId,
        name: form.name,
        abbreviation: form.abbreviation,
        modality: form.modality || null,
        gender: form.gender || null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      const detail = data?.detail ? ` (${data.detail})` : "";
      const fallback = editingId
        ? "No se pudo actualizar la categoria"
        : "No se pudo crear la categoria";
      setError(`${data?.error ?? fallback}${detail}`);
      return;
    }

    const updatedCategory = data.category as Category;
    if (editingId) {
      const next = sortCategories(
        categories.map((category) =>
          category.id === editingId ? updatedCategory : category
        ),
        sportNameById
      );
      setCategories(next);
      setEditingId(null);
      resetForm();
      setMessage("Categoria actualizada");
    } else {
      const next = sortCategories([...categories, updatedCategory], sportNameById);
      setCategories(next);
      setForm((prev) => ({ ...prev, name: "", abbreviation: "" }));
      setMessage("Categoria creada");
    }
  };

  const startEditing = (category: Category) => {
    const racquetball = isRacquetballName(
      category.sport?.name ?? sportNameById.get(category.sportId)
    );
    setEditingId(category.id);
    setForm({
      sportId: category.sportId,
      name: category.name,
      abbreviation: category.abbreviation,
      modality: category.modality ?? (racquetball ? "SINGLES" : ""),
      gender: category.gender ?? (racquetball ? "MALE" : ""),
    });
    setError(null);
    setMessage("Editando categoria");
  };

  const cancelEditing = () => {
    setEditingId(null);
    resetForm();
    setError(null);
    setMessage(null);
  };

  const sortedCategories = useMemo(
    () => sortCategories(categories, sportNameById),
    [categories, sportNameById]
  );

  const modalityLabel = (value?: Category["modality"]) => {
    if (value === "SINGLES") return "Singles";
    if (value === "DOUBLES") return "Dobles";
    return "—";
  };

  const genderLabel = (value?: Category["gender"]) => {
    if (value === "MALE") return "Varones";
    if (value === "FEMALE") return "Mujeres";
    if (value === "MIXED") return "Mixto";
    return "—";
  };

  return (
    <div className="space-y-8">
      <div className="admin-fade-up relative overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-300/70 via-sky-300/60 to-amber-200/70" />
        <h2 className="text-2xl font-semibold text-slate-900">
          {editingId ? "Editar categoria" : "Crear categoria"}
        </h2>
        <p className="text-sm text-slate-600">
          {editingId
            ? "Actualiza el nombre o la abreviacion de la categoria."
            : "Define una categoria por deporte con nombre y abreviacion."}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Deporte</label>
            <select
              value={form.sportId}
              onChange={(e) => handleSportChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Selecciona deporte</option>
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Ej. Primera"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Abreviacion</label>
            <input
              value={form.abbreviation}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, abbreviation: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Ej. PRI"
            />
          </div>
          {isRacquetballSelected && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Modalidad</label>
              <select
                value={form.modality}
                onChange={(e) => {
                  const value = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    modality: value,
                    gender:
                      value === "SINGLES" && prev.gender === "MIXED"
                        ? "MALE"
                        : prev.gender || "MALE",
                  }));
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Selecciona modalidad</option>
                <option value="SINGLES">Singles</option>
                <option value="DOUBLES">Dobles</option>
              </select>
            </div>
          )}
          {isRacquetballSelected && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Genero</label>
              <select
                value={form.gender}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, gender: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">Selecciona genero</option>
                <option value="MALE">Varones</option>
                <option value="FEMALE">Mujeres</option>
                {form.modality === "DOUBLES" && <option value="MIXED">Mixto</option>}
              </select>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          {editingId && (
            <button
              type="button"
              onClick={cancelEditing}
              className="mr-3 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={saveCategory}
            disabled={
              loading ||
              !form.sportId ||
              form.name.trim().length < 2 ||
              form.abbreviation.trim().length < 1 ||
              (isRacquetballSelected && (!form.modality || !form.gender))
            }
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(79,70,229,0.5)] transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? "Guardando..."
              : editingId
              ? "Guardar cambios"
              : "Crear categoria"}
          </button>
        </div>

        {sports.length === 0 && (
          <p className="mt-3 text-sm text-slate-500">
            Primero crea un deporte para poder registrar categorias.
          </p>
        )}
      </div>

      <div className="admin-fade-up relative overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-slate-200/80 via-indigo-200/60 to-slate-200/80" />
        <h3 className="text-lg font-semibold text-slate-900">Categorias registradas</h3>
        {sortedCategories.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Aun no hay categorias.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/80 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.2)]">
            <table className="min-w-full divide-y divide-slate-200/70 text-sm">
              <thead className="bg-slate-50/80 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold">Deporte</th>
                  <th className="px-3 py-3 text-left font-semibold">Categoria</th>
                  <th className="px-3 py-3 text-left font-semibold">Abrev.</th>
                  <th className="px-3 py-3 text-left font-semibold">Modalidad</th>
                  <th className="px-3 py-3 text-left font-semibold">Genero</th>
                  <th className="px-3 py-3 text-left font-semibold">ID</th>
                  <th className="px-3 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCategories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-3 py-2 text-slate-700">
                      {category.sport?.name ??
                        sportNameById.get(category.sportId) ??
                        "N/D"}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {category.name}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {category.abbreviation}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {modalityLabel(category.modality)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {genderLabel(category.gender)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {category.id}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => startEditing(category)}
                        className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-white"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
