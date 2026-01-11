"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Sport = {
  id: string;
  name: string;
};

type Props = {
  initialSports: Sport[];
};

export default function SportsManager({ initialSports }: Props) {
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>(initialSports);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const createSport = async () => {
    setError(null);
    setMessage(null);
    setLoading(true);

    const res = await fetch("/api/sports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "No se pudo crear el deporte");
      return;
    }

    setSports((prev) => [...prev, data.sport].sort((a, b) => a.name.localeCompare(b.name)));
    setName("");
    setMessage("Deporte creado");
    router.refresh();
  };

  return (
    <div className="space-y-8">
      <div className="admin-fade-up relative overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-300/70 via-sky-300/60 to-amber-200/70" />
        <h2 className="text-2xl font-semibold text-slate-900">Agregar deporte</h2>
        <p className="text-sm text-slate-600">ID autogenerado, solo ingresa el nombre.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Racquetball"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button
            type="button"
            disabled={loading || name.trim().length < 2}
            onClick={createSport}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(79,70,229,0.5)] transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {loading ? "Guardando..." : "Crear"}
          </button>
        </div>
        {error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        )}
      </div>

      <div className="admin-fade-up relative overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-slate-200/80 via-indigo-200/60 to-slate-200/80" />
        <h3 className="text-lg font-semibold text-slate-900">Deportes existentes</h3>
        {sports.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Aún no hay deportes.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sports.map((sport) => (
              <li
                key={sport.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 text-sm text-slate-800 shadow-[0_12px_30px_-22px_rgba(15,23,42,0.25)]"
              >
                <span className="font-medium">{sport.name}</span>
                <span className="text-xs text-slate-500">ID: {sport.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
