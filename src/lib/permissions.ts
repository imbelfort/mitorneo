import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/types/auth";

export const canManageLeague = async (
  user: AuthUser,
  leagueId: string,
  ownerId?: string | null
) => {
  if (user.role === "ADMIN") return true;
  if (ownerId && ownerId === user.id) return true;
  const permission = await prisma.leaguePermission.findFirst({
    where: { leagueId, userId: user.id },
    select: { id: true },
  });
  return Boolean(permission);
};

export const canManageTournament = async (
  user: AuthUser,
  tournamentId: string,
  ownerId?: string | null
) => {
  if (user.role === "ADMIN") return true;
  if (ownerId && ownerId === user.id) return true;
  const permission = await prisma.tournamentPermission.findFirst({
    where: { tournamentId, userId: user.id },
    select: { id: true },
  });
  return Boolean(permission);
};
