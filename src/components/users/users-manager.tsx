"use client";

import { useMemo, useState } from "react";

type Role = "ADMIN" | "TOURNAMENT_ADMIN";

export type AdminUser = {
  id: string;
  name?: string | null;
  email: string;
  phone?: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

type UserForm = {
  name: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
};

const emptyForm = (): UserForm => ({
  name: "",
  email: "",
  phone: "",
  role: "TOURNAMENT_ADMIN",
  password: "",
});

const roleLabel = (role: Role) =>
  role === "ADMIN" ? "Administrador" : "Administrador de torneo";

export default function UsersManager({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => {
      const name = user.name?.toLowerCase() ?? "";
      const phone = user.phone?.toLowerCase() ?? "";
      return (
        name.includes(q) ||
        user.email.toLowerCase().includes(q) ||
        phone.includes(q) ||
        user.role.toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, page, pageSize]);

  const refreshUsers = async () => {
    const res = await fetch("/api/users", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && Array.isArray(data.users)) {
      setUsers(data.users as AdminUser[]);
      setPage(1);
    }
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: form.name.trim() || null,
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      password: form.password.trim(),
    };

    if (!payload.email || !payload.phone) {
      setError("El correo y el telefono son obligatorios.");
      setLoading(false);
      return;
    }

    if (!editingId && payload.password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    const res = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "No se pudo guardar el usuario");
      return;
    }

    await refreshUsers();
    resetForm();
    setMessage(editingId ? "Usuario actualizado" : "Usuario creado");
  };

  const startEditing = (user: AdminUser) => {
    setEditingId(user.id);
    setForm({
      name: user.name ?? "",
      email: user.email,
      phone: user.phone ?? "",
      role: user.role,
      password: "",
    });
    setMessage("Editando usuario");
    setError(null);
  };

  const handleDelete = async (user: AdminUser) => {
    const confirmed = window.confirm(
      `Eliminar al usuario ${user.email}? Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/users/${user.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data?.error ?? "No se pudo eliminar el usuario");
      return;
    }

    await refreshUsers();
    setMessage("Usuario eliminado");
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {editingId ? "Editar usuario" : "Crear usuario"}
            </h2>
            <p className="text-xs text-slate-500">
              Gestiona roles y credenciales. La contrasena es requerida al crear.
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:border-slate-300"
            >
              Cancelar edicion
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Nombre
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="Nombre"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Correo
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="correo@dominio.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Telefono
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder="+591..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Rol
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, role: e.target.value as Role }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
            >
              <option value="ADMIN">Administrador</option>
              <option value="TOURNAMENT_ADMIN">Administrador de torneo</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {editingId ? "Nueva contrasena" : "Contrasena"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
              placeholder={editingId ? "Opcional" : "Minimo 6 caracteres"}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Guardando..." : editingId ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Usuarios</h2>
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="w-full max-w-xs rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700"
            placeholder="Buscar por nombre, email, telefono o rol"
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[640px] text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Correo</th>
                <th className="px-4 py-3 text-left">Telefono</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {user.name ?? "Sin nombre"}
                  </td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {roleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(user)}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:border-rose-300"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">
                    No hay usuarios que coincidan con la busqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <span>
              Mostrando {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, filteredUsers.length)} de{" "}
              {filteredUsers.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
