import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import ProfileForm from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Perfil</h1>
          <p className="mt-1 text-slate-600">
            Edita tus datos personales y tu contrasena.
          </p>
        </div>
        <ProfileForm user={user} />
      </div>
    </main>
  );
}
