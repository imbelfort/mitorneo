"use client";

import { useState } from "react";
import { useAuth } from "@/app/providers";

type ProfileUser = {
  name: string | null;
  email: string;
  phone: string | null;
};

type Props = {
  user: ProfileUser;
};

export default function ProfileForm({ user }: Props) {
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    name: user.name ?? "",
    phone: user.phone ?? "",
    currentPassword: "",
    newPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    if (form.name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres");
      return;
    }

    const wantsPasswordChange =
      form.currentPassword.trim().length > 0 || form.newPassword.trim().length > 0;
    if (wantsPasswordChange) {
      if (!form.currentPassword.trim() || !form.newPassword.trim()) {
        setError("Completa contrasena actual y nueva");
        return;
      }
      if (form.newPassword.trim().length < 6) {
        setError("La nueva contrasena debe tener al menos 6 caracteres");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          currentPassword: wantsPasswordChange ? form.currentPassword : undefined,
          newPassword: wantsPasswordChange ? form.newPassword : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "No se pudo guardar el perfil");
        return;
      }
      setForm((prev) => ({
        ...prev,
        name: data?.user?.name ?? prev.name,
        phone: data?.user?.phone ?? "",
        currentPassword: "",
        newPassword: "",
      }));
      await refresh();
      setMessage("Perfil actualizado");
    } catch {
      setError("No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Datos del perfil</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Nombre</label>
            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Tu nombre"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Correo</label>
            <input
              value={user.email}
              readOnly
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 shadow-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Telefono</label>
            <input
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Ej. 70000000"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Cambiar contrasena</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Contrasena actual
            </label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => updateField("currentPassword", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Nueva contrasena
            </label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => updateField("newPassword", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Debe tener al menos 6 caracteres.
        </p>
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(79,70,229,0.5)] transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
