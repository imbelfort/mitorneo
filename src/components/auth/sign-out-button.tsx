"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  const handleSignOut = async () => {
    setLoading(true);
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
    >
      {loading ? "Saliendo..." : "Cerrar sesion"}
    </button>
  );
}
