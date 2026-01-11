import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function TournamentStepOnePage() {
  const session = await getServerSession(authOptions);

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    redirect("/");
  }

  redirect("/admin/tournaments");
}
