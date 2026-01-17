"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Session } from "next-auth";
import { FormEvent, useState } from "react";
import SignOutButton from "./sign-out-button";

type AuthPanelProps = {
  session: Session | null;
};

type Mode = "signup" | "signin";

export default function AuthPanel({ session }: AuthPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const updateField = (
    field: "name" | "email" | "phone" | "password",
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "signup") {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error ?? "No se pudo crear la cuenta");
        setLoading(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
        callbackUrl: "/",
      });

      setLoading(false);

      if (signInResult?.error) {
        setMessage("Cuenta creada. Inicia sesion con tus credenciales.");
        return;
      }

      router.push("/admin");
      router.refresh();
      return;
    }

    const result = await signIn("credentials", {
      email: form.email.trim(),
      password: form.password,
      redirect: false,
      callbackUrl: "/",
    });

    setLoading(false);

    if (result?.error) {
      setError("Correo o contrasena incorrectos");
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  if (session) {
    return (
      <div className="admin-fade-up relative h-full overflow-hidden rounded-[28px] bg-white/80 p-8 shadow-[0_30px_70px_-55px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/70 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
        <span className="absolute right-6 top-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
          Sesion activa
        </span>
        <h3 className="mt-3 text-2xl font-semibold text-slate-900">
          Hola, {session.user?.name ?? "Usuario"}
        </h3>
        <p className="mt-1 text-sm text-slate-600">{session.user?.email}</p>
        <p className="mt-3 inline-flex rounded-full bg-slate-100/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
          Rol: {session.user?.role === "ADMIN" ? "Administrador" : "Administrador de torneo"}
        </p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-fade-up relative h-full overflow-hidden rounded-[28px] bg-white/80 p-8 shadow-[0_30px_70px_-55px_rgba(15,23,42,0.5)] ring-1 ring-slate-200/70 backdrop-blur">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/70 to-transparent" />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-indigo-500/90">
            Crea tu cuenta
          </p>
          <h3 className="text-2xl font-semibold text-slate-900">
            {mode === "signup" ? "Crear tu torneo" : "Iniciar sesion"}
          </h3>
        </div>
        <div className="flex rounded-full border border-slate-200/80 bg-white/70 p-1 text-xs font-semibold text-slate-700 shadow-sm">
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-full px-3 py-1.5 transition ${mode === "signup"
              ? "bg-indigo-600 text-white shadow-sm"
              : "hover:bg-slate-100"
              }`}
          >
            Crear cuenta
          </button>
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-full px-3 py-1.5 transition ${mode === "signin"
              ? "bg-slate-900 text-white shadow-sm"
              : "hover:bg-slate-100"
              }`}
          >
            Iniciar sesion
          </button>
        </div>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {mode === "signin" && (
          <div className="flex justify-end">
            <a
              href="/forgot-password"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Olvide mi contrasena
            </a>
          </div>
        )}
        {mode === "signup" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="name">
              Nombre
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Tu nombre"
            />
          </div>
        )}
        {mode === "signup" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="phone">
              Telefono
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="+591..."
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="email">
            Correo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="password">
            Contrasena
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            required
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            placeholder="********"
          />
          <p className="text-xs text-slate-500">
            {mode === "signup"
              ? "Minimo 6 caracteres para proteger tu torneo."
              : "Usa la contrasena que registraste."}
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

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-22px_rgba(79,70,229,0.5)] transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {loading
            ? "Procesando..."
            : mode === "signup"
              ? "Crear cuenta y entrar"
              : "Entrar"}
        </button>
      </form>
    </div>
  );
}
