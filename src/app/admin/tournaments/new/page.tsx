import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function TournamentStepOnePage() {
  const session = await getServerSession();

  if (
    !session ||
    (session.user.role !== "ADMIN" && session.user.role !== "TOURNAMENT_ADMIN")
  ) {
    redirect("/");
  }

  redirect("/admin/tournaments");
}

