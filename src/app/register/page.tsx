
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setLoading(true);

        const formData = new FormData(event.currentTarget);
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const phone = formData.get("phone") as string;
        const password = formData.get("password") as string;

        try {
            // 1. Crear el usuario
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    password,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.error ?? "No se pudo crear la cuenta");
            }

            // 2. Iniciar sesión automáticamente
            const signInResult = await signIn("credentials", {
                email: email.trim(),
                password,
                redirect: false,
                callbackUrl: "/admin",
            });

            if (signInResult?.error) {
                // Si el login falla pero el registro fue exitoso (raro), mandamos al login
                router.push("/login?message=Cuenta creada exitosamente");
                return;
            }

            // 3. Redirigir al panel de administración
            router.push("/admin");
            router.refresh();

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Ocurrió un error inesperado");
            }
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-6 py-10">
            <div className="w-full max-w-lg rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-200">
                <div className="mb-8 flex flex-col items-center gap-4 text-center">
                    <Link href="/">
                        <Image
                            src="/logo/logo2.png"
                            alt="MiTorneo"
                            width={240}
                            height={80}
                            className="h-16 w-auto object-contain"
                            priority
                        />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Crea tu cuenta
                        </h1>
                        <p className="mt-2 text-sm text-slate-600">
                            Empieza a organizar tus torneos en minutos
                        </p>
                    </div>
                </div>

                <form className="space-y-5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-slate-700">
                            Nombre completo
                        </label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            required
                            autoComplete="name"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="Juan Pérez"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-slate-700">
                            Correo electrónico
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
                        <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                            Telefono
                        </label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            required
                            autoComplete="tel"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="+591..."
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label
                            htmlFor="password"
                            className="text-sm font-medium text-slate-700"
                        >
                            Contraseña
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            autoComplete="new-password"
                            minLength={6}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 shadow-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 md:col-span-2">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 md:col-span-2"
                    >
                        {loading ? "Creando cuenta..." : "Crear cuenta"}
                    </button>
                </form>

                <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
                    <span>¿Ya tienes cuenta?</span>
                    <Link
                        href="/login"
                        className="font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                        Inicia sesión
                    </Link>
                </div>
            </div>
        </main>
    );
}
