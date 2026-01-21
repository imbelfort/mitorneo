"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/app/providers";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const { login } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await login(email, password);

    setLoading(false);

    if (!result.ok) {
      setError("Correo o contrasena incorrectos");
      return;
    }

    const redirectUrl = callbackUrl == "/" ? "/admin" : callbackUrl;
    router.push(redirectUrl);
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <section className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-10 text-slate-900 shadow-2xl ring-1 ring-slate-200">
          <div className="mb-8 flex flex-col items-center gap-4 text-center">
            <Link href="/">
              <Image
                src="/logo/logo2.png"
                  alt="MiTorneo"
                  width={220}
                  height={70}
                  className="logo-light h-10 w-auto object-contain sm:h-14"
                  priority
                />
              <Image
                src="/logo/logoletrablanca.png"
                alt="MiTorneo"
                width={220}
                height={70}
                className="logo-dark h-10 w-auto object-contain sm:h-14"
                priority
              />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">Inicia sesion</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Accede a tu panel de torneos
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700"
                >
                  Correo
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  Contrasena
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="********"
                />
                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Olvide mi contrasena
                  </Link>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                {loading ? "Ingresando..." : "Iniciar sesion"}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>Sin cuenta? Registrate para crear tu torneo.</span>
              <div className="flex items-center gap-3">
                <Link
                  href="/register"
                  className="rounded-full border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                >
                  Crear cuenta
                </Link>
                <Link
                  href="/"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Volver al inicio
                </Link>
              </div>
            </div>
        </section>
      </div>
    </main>
  );
}
