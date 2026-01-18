"use client";

import { useEffect, useMemo, useState } from "react";
import { BracketCanvas } from "@/components/tournaments/bracket-canvas";
import {
  computeTournamentStandingsByCategory,
  type TournamentRankingData,
} from "@/lib/ranking";

type Sponsor = {
  id?: string;
  name?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
};

type Club = {
  id: string;
  name: string;
  address?: string | null;
  courtsCount?: number | null;
};

type Category = {
  id: string;
  name: string;
  abbreviation: string;
  sport?: { id: string; name: string } | null;
};

type TournamentCategory = {
  categoryId: string;
  price: string;
  secondaryPrice: string;
  siblingPrice: string;
  drawType?: string | null;
  category: Category;
};

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  city?: string | null;
  country?: string | null;
  photoUrl?: string | null;
};

type Registration = {
  id: string;
  categoryId: string;
  playerId: string;
  partnerId?: string | null;
  partnerTwoId?: string | null;
  teamName?: string | null;
  groupName?: string | null;
  rankingNumber?: number | null;
  player: Player;
  partner?: Player | null;
  partnerTwo?: Player | null;
  createdAt: string;
};

type Match = {
  id: string;
  categoryId: string;
  groupName?: string | null;
  stage: string;
  isBronzeMatch?: boolean | null;
  roundNumber?: number | null;
  scheduledDate?: string | null;
  startTime?: string | null;
  courtNumber?: number | null;
  club?: Club | null;
  games?: unknown;
  liveState?: { isLive?: boolean } | null;
  winnerSide?: string | null;
  outcomeType?: string | null;
  outcomeSide?: string | null;
  teamAId?: string | null;
  teamBId?: string | null;
  teamA?: Registration | null;
  teamB?: Registration | null;
  category?: Category | null;
};

type Prize = {
  id: string;
  categoryId: string;
  placeFrom: number;
  placeTo?: number | null;
  amount?: string | null;
  prizeText?: string | null;
  category?: Category | null;
};

type TournamentPublicData = {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  registrationDeadline?: string | null;
  rulesText?: string | null;
  playDays: string[];
  sport?: { id: string; name: string } | null;
  league?: { id: string; name: string; photoUrl?: string | null } | null;
  owner?: { name?: string | null; email?: string | null } | null;
  clubs: Club[];
  sponsors: Sponsor[];
  categories: TournamentCategory[];
  registrations: Registration[];
  matches: Match[];
  prizes: Prize[];
  groupPoints?: {
    winPoints: number;
    winWithoutGameLossPoints: number;
    lossPoints: number;
    lossWithGameWinPoints: number;
    tiebreakerOrder?: unknown;
  } | null;
};

type TabKey =
  | "info"
  | "participants"
  | "groups"
  | "standings"
  | "bracket"
  | "fixture"
  | "results"
  | "prizes"
  | "contact";

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Info" },
  { key: "participants", label: "Participantes" },
  { key: "groups", label: "Sembrado" },
  { key: "standings", label: "Posiciones" },
  { key: "bracket", label: "Brackets" },
  { key: "fixture", label: "Fixture" },
  { key: "results", label: "Resultados" },
  { key: "prizes", label: "Premios" },
  { key: "contact", label: "Contacto" },
];

  const formatDateLong = (value?: string | null) => {
    if (!value) return "N/D";
    const trimmed = value.trim();
    if (!trimmed) return "N/D";
    const datePart = trimmed.includes("T") ? trimmed.split("T")[0] : trimmed;
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
    const parsed = dateOnlyMatch
      ? new Date(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3])
        )
      : new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("es-BO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

const formatDateShort = (value?: string | null) => {
  if (!value) return "N/D";
  const trimmed = value.trim();
  if (!trimmed) return "N/D";
  const datePart = trimmed.includes("T") ? trimmed.split("T")[0] : trimmed;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  const parsed = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      )
    : new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatOrdinal = (value: number) => {
  if (value === 1) return "1ro";
  if (value === 2) return "2do";
  if (value === 3) return "3ro";
  return `${value}to`;
};

const formatMatchScore = (match: Match) => {
  if (!Array.isArray(match.games)) return null;
  const parts: string[] = [];
  for (const entry of match.games) {
    if (!entry || typeof entry !== "object") continue;
    const a = (entry as { a?: unknown }).a;
    const b = (entry as { b?: unknown }).b;
    if (typeof a !== "number" || typeof b !== "number") continue;
    parts.push(`${a}-${b}`);
  }
  return parts.length ? parts.join(" | ") : null;
};

const isMatchComplete = (match: Match) => {
  const outcomeType = match.outcomeType ?? "PLAYED";
  if (outcomeType !== "PLAYED") {
    return Boolean(match.outcomeSide || match.winnerSide);
  }
  if (match.winnerSide) return true;
  return Array.isArray(match.games) && match.games.length > 0;
};

const formatPlayoffRoundLabel = (bracketSize: number, roundNumber: number) => {
  const roundSize = Math.max(
    2,
    Math.floor(bracketSize / Math.pow(2, roundNumber - 1))
  );
  if (roundSize === 2) return "Final";
  if (roundSize === 4) return "Semifinal";
  if (roundSize === 8) return "Cuartos";
  if (roundSize === 16) return "Ronda de 16";
  if (roundSize === 32) return "Ronda de 32";
  if (roundSize === 64) return "Ronda de 64";
  return `Ronda de ${roundSize}`;
};

const describePrizePlace = (placeFrom: number, placeTo?: number | null) => {
  const toValue = placeTo ?? placeFrom;
  if (placeFrom === toValue) {
    if (placeFrom === 1) return "1er lugar";
    if (placeFrom === 2) return "2do lugar";
    if (placeFrom === 3) return "3er lugar";
    if (placeFrom === 4) return "4to lugar";
    if (placeFrom === 5) return "5to lugar";
    return `Lugar ${placeFrom}`;
  }
  if (placeFrom === 3 && toValue === 4) return "Semifinal";
  if (placeFrom === 5 && toValue === 8) return "Cuartos de final";
  if (placeFrom === 1 && toValue === 2) return "Final";
  return `Lugar ${placeFrom} a ${toValue}`;
};

const playerLabel = (player?: Player | null) =>
  player ? `${player.firstName} ${player.lastName}` : "Por definir";

const teamLabel = (registration?: Registration | null) => {
  if (!registration) return "Por definir";
  if (registration.teamName) return registration.teamName;
  const names = [
    registration.player,
    registration.partner,
    registration.partnerTwo,
  ]
    .filter(Boolean)
    .map((p) => playerLabel(p as Player));
  return names.join(" / ");
};

const teamMembersLabel = (registration: Registration) => {
  const members = [registration.player, registration.partner, registration.partnerTwo].filter(
    Boolean
  ) as Player[];
  return members.map((member) => `${member.firstName} ${member.lastName}`).join(" / ");
};

const registrationLocation = (registration: Registration) => {
  const members = [registration.player, registration.partner, registration.partnerTwo].filter(
    Boolean
  ) as Player[];
  const city = members.find((member) => member.city)?.city ?? "";
  const country = members.find((member) => member.country)?.country ?? "";
  return [city, country].filter(Boolean).join(", ");
};

export default function TournamentPublic({
  tournament,
}: {
  tournament: TournamentPublicData;
}) {
  const [tab, setTab] = useState<TabKey>("info");
  const [participantQuery, setParticipantQuery] = useState("");
  const [participantDraft, setParticipantDraft] = useState("");
  const [matches, setMatches] = useState<Match[]>(tournament.matches);
  const [matchesError, setMatchesError] = useState<string | null>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  useEffect(() => {
    const liveTabs: TabKey[] = ["fixture", "results", "bracket", "positions"];
    if (!liveTabs.includes(tab)) return;
    let active = true;

    const loadMatches = async () => {
      try {
        const response = await fetch(
          `/api/tournaments/${tournament.id}/public-matches`,
          { cache: "no-store" }
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? "No se pudo actualizar el calendario");
        }
        if (!active) return;
        setMatches(Array.isArray(data.matches) ? data.matches : []);
        setMatchesError(null);
      } catch (err) {
        if (!active) return;
        setMatchesError(
          err instanceof Error ? err.message : "No se pudo actualizar el calendario"
        );
      }
    };

    void loadMatches();
    const interval = window.setInterval(loadMatches, 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [tab, tournament.id]);

  const categoriesById = useMemo(() => {
    const map = new Map<string, Category>();
    tournament.categories.forEach((entry) => {
      map.set(entry.categoryId, entry.category);
    });
    return map;
  }, [tournament.categories]);

  const categoryDrawTypeById = useMemo(() => {
    const map = new Map<string, string | null>();
    tournament.categories.forEach((entry) => {
      map.set(entry.categoryId, entry.drawType ?? null);
    });
    return map;
  }, [tournament.categories]);

  const groupStageCompleteByCategory = useMemo(() => {
    const map = new Map<string, boolean>();
    const groupMatchesByCategory = new Map<string, Match[]>();
    matches
      .filter((match) => match.stage === "GROUP")
      .forEach((match) => {
        if (!groupMatchesByCategory.has(match.categoryId)) {
          groupMatchesByCategory.set(match.categoryId, []);
        }
        groupMatchesByCategory.get(match.categoryId)?.push(match);
      });

    groupMatchesByCategory.forEach((list, categoryId) => {
      const allComplete =
        list.length > 0 && list.every((match) => isMatchComplete(match));
      map.set(categoryId, allComplete);
    });

    return map;
  }, [matches]);

  const normalizedParticipantQuery = participantQuery.trim().toLowerCase();

  const participantRows = useMemo(() => {
    const rows: {
      id: string;
      player: Player;
      category: Category;
      teamName: string | null;
      location: string;
      createdAt: string;
    }[] = [];

    tournament.registrations.forEach((registration) => {
      const category =
        categoriesById.get(registration.categoryId) ??
        tournament.categories.find((entry) => entry.categoryId === registration.categoryId)
          ?.category;
      if (!category) return;
      const members = [registration.player, registration.partner, registration.partnerTwo].filter(
        Boolean
      ) as Player[];
      const location = registrationLocation(registration);
      members.forEach((member) => {
        rows.push({
          id: `${registration.id}-${member.id}`,
          player: member,
          category,
          teamName: registration.teamName ?? null,
          location,
          createdAt: registration.createdAt,
        });
      });
    });
    return rows;
  }, [tournament.registrations, tournament.categories, categoriesById]);

  const registrationById = useMemo(() => {
    const map = new Map<string, Registration>();
    tournament.registrations.forEach((registration) => {
      map.set(registration.id, registration);
    });
    return map;
  }, [tournament.registrations]);

  const registrationMap = useMemo(() => {
    const map = new Map<string, Registration>();
    tournament.registrations.forEach((registration) => {
      map.set(registration.id, registration);
    });
    return map;
  }, [tournament.registrations]);

  const filteredParticipantRows = useMemo(() => {
    if (!normalizedParticipantQuery) return participantRows;
    return participantRows.filter((row) => {
      const name = `${row.player.firstName} ${row.player.lastName}`.toLowerCase();
      const teamName = (row.teamName ?? "").toLowerCase();
      const category = `${row.category.name} ${row.category.abbreviation}`.toLowerCase();
      const location = row.location.toLowerCase();
      const combined = [name, teamName, category, location].join(" ");
      return combined.includes(normalizedParticipantQuery);
    });
  }, [participantRows, normalizedParticipantQuery]);

  const groupSeedings = useMemo(() => {
    const map = new Map<
      string,
      { category: Category; groups: Map<string, Registration[]> }
    >();
    tournament.registrations.forEach((registration) => {
      const category =
        categoriesById.get(registration.categoryId) ??
        tournament.categories.find((entry) => entry.categoryId === registration.categoryId)
          ?.category;
      if (!category) return;
      if (!registration.groupName) return;
      const entry = map.get(registration.categoryId) ?? {
        category,
        groups: new Map<string, Registration[]>(),
      };
      const groupKey = registration.groupName.trim() || "A";
      const list = entry.groups.get(groupKey) ?? [];
      list.push(registration);
      entry.groups.set(groupKey, list);
      map.set(registration.categoryId, entry);
    });

    return Array.from(map.values()).map((entry) => {
      const groups = Array.from(entry.groups.entries()).map(([key, list]) => {
        const sorted = [...list].sort((a, b) => {
          const rankA = a.rankingNumber ?? Number.MAX_SAFE_INTEGER;
          const rankB = b.rankingNumber ?? Number.MAX_SAFE_INTEGER;
          if (rankA !== rankB) return rankA - rankB;
          return a.createdAt.localeCompare(b.createdAt);
        });
        return { key, list: sorted };
      });
      groups.sort((a, b) => a.key.localeCompare(b.key));
      return { category: entry.category, groups };
    });
  }, [tournament.registrations, categoriesById, tournament.categories]);

  const standingsByCategory = useMemo(() => {
    const data: TournamentRankingData = {
      categories: tournament.categories.map((entry) => ({
        categoryId: entry.categoryId,
        drawType: undefined,
      })),
      registrations: tournament.registrations.map((registration) => ({
        id: registration.id,
        categoryId: registration.categoryId,
        groupName: registration.groupName ?? null,
        seed: null,
        rankingNumber: registration.rankingNumber ?? null,
        createdAt: registration.createdAt,
        playerId: registration.playerId,
        partnerId: registration.partnerId ?? null,
        partnerTwoId: registration.partnerTwoId ?? null,
      })),
      matches: matches.map((match) => ({
        categoryId: match.categoryId,
        groupName: match.groupName ?? null,
        stage: match.stage as TournamentRankingData["matches"][number]["stage"],
        roundNumber: match.roundNumber ?? null,
        games: match.games,
        teamAId: match.teamAId ?? null,
        teamBId: match.teamBId ?? null,
        winnerSide: match.winnerSide as TournamentRankingData["matches"][number]["winnerSide"],
        outcomeType: match.outcomeType as TournamentRankingData["matches"][number]["outcomeType"],
        outcomeSide: match.outcomeSide as TournamentRankingData["matches"][number]["outcomeSide"],
        isBronzeMatch: match.isBronzeMatch ?? null,
      })),
      groupPoints: tournament.groupPoints ?? null,
      rankingPoints: [],
    };
    return computeTournamentStandingsByCategory(data);
  }, [tournament.categories, tournament.registrations, matches, tournament.groupPoints]);

  const labelByRegistration = useMemo(() => {
    const map = new Map<string, string>();
    standingsByCategory.forEach((entries) => {
      const groupMap = new Map<string, typeof entries>();
      entries.forEach((entry) => {
        const groupKey = entry.groupName ?? "A";
        const list = groupMap.get(groupKey) ?? [];
        list.push(entry);
        groupMap.set(groupKey, list);
      });
      groupMap.forEach((list, groupKey) => {
        list.forEach((entry, index) => {
          map.set(
            entry.id,
            `${formatOrdinal(index + 1)} Grupo ${groupKey}`
          );
        });
      });
    });
    return map;
  }, [standingsByCategory]);

  const standingsByCategoryGroups = useMemo(() => {
    const result: {
      category: Category;
      groups: { key: string; entries: ReturnType<typeof standingsByCategory.get>[number][] }[];
    }[] = [];

    standingsByCategory.forEach((entries, categoryId) => {
      const category =
        categoriesById.get(categoryId) ??
        tournament.categories.find((entry) => entry.categoryId === categoryId)?.category;
      if (!category) return;
      const groupMap = new Map<string, typeof entries>();
      entries.forEach((entry) => {
        const groupKey = entry.groupName ?? "A";
        const list = groupMap.get(groupKey) ?? [];
        list.push(entry);
        groupMap.set(groupKey, list);
      });
      const groups = Array.from(groupMap.entries()).map(([key, list]) => ({
        key,
        entries: list,
      }));
      groups.sort((a, b) => a.key.localeCompare(b.key));
      result.push({ category, groups });
    });

    return result;
  }, [standingsByCategory, categoriesById, tournament.categories]);

  const playoffBrackets = useMemo(() => {
    const map = new Map<string, { category: Category; matches: Match[] }>();
    matches
      .filter((match) => match.stage === "PLAYOFF" && !match.isBronzeMatch)
      .forEach((match) => {
        const category =
          categoriesById.get(match.categoryId) ??
          tournament.categories.find((entry) => entry.categoryId === match.categoryId)
            ?.category;
        if (!category) return;
        const entry = map.get(match.categoryId) ?? { category, matches: [] };
        entry.matches.push(match);
        map.set(match.categoryId, entry);
      });

    return Array.from(map.values()).map((entry) => {
      const drawType = categoryDrawTypeById.get(entry.category.id) ?? null;
      const isWaiting =
        drawType === "GROUPS_PLAYOFF" &&
        !(groupStageCompleteByCategory.get(entry.category.id) ?? false);
      const bracketMatches = isWaiting
        ? entry.matches.map((match) => ({
            ...match,
            teamAId: null,
            teamBId: null,
            teamA: null,
            teamB: null,
          }))
        : entry.matches;
      const roundNumbers = Array.from(
        new Set(
          bracketMatches
            .map((match) => match.roundNumber ?? 1)
            .filter((round) => typeof round === "number")
        )
      ).sort((a, b) => a - b);
      const firstRound = roundNumbers[0] ?? 1;
      const firstRoundMatches = bracketMatches.filter(
        (match) => (match.roundNumber ?? 1) === firstRound
      );
      const bracketSize =
        firstRoundMatches.length > 0 ? firstRoundMatches.length * 2 : undefined;
      const matchStatusByMatchId = new Map<string, string>();
      bracketMatches.forEach((match) => {
        const score = formatMatchScore(match);
        if (score) {
          matchStatusByMatchId.set(match.id, score);
        }
      });
      return {
        category: entry.category,
        matches: bracketMatches,
        roundNumbers,
        bracketSize,
        matchStatusByMatchId,
      };
    });
  }, [matches, categoriesById, tournament.categories, categoryDrawTypeById, groupStageCompleteByCategory]);

  const bracketSizeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    playoffBrackets.forEach((entry) => {
      if (entry.bracketSize) {
        map.set(entry.category.id, entry.bracketSize);
      }
    });
    return map;
  }, [playoffBrackets]);

  const playoffRoundsByCategory = useMemo(() => {
    const map = new Map<string, number[]>();
    playoffBrackets.forEach((entry) => {
      map.set(entry.category.id, entry.roundNumbers);
    });
    return map;
  }, [playoffBrackets]);

  const matchesByDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    matches.forEach((match) => {
      const dateKey = match.scheduledDate
        ? match.scheduledDate.split("T")[0]
        : "sin-fecha";
      const list = map.get(dateKey) ?? [];
      list.push(match);
      map.set(dateKey, list);
    });
    return map;
  }, [matches]);

  const resultMatches = useMemo(
    () =>
      matches.filter((match) => {
        const score = formatMatchScore(match);
        return Boolean(
          score ||
            match.winnerSide ||
            (match.outcomeType && match.outcomeType !== "PLAYED")
        );
      }),
    [matches]
  );

  const prizesByCategory = useMemo(() => {
    const map = new Map<string, { category: Category | null; prizes: Prize[] }>();
    tournament.prizes.forEach((prize) => {
      const category = prize.category ?? null;
      const key = prize.categoryId;
      const entry = map.get(key) ?? { category, prizes: [] };
      entry.prizes.push(prize);
      map.set(key, entry);
    });
    return Array.from(map.values());
  }, [tournament.prizes]);

  const toggleTeamExpanded = (key: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getTeamMembers = (registration?: Registration | null) => {
    if (!registration) return [];
    return [registration.player, registration.partner, registration.partnerTwo]
      .filter(Boolean)
      .map((player) => playerLabel(player as Player));
  };

  const getPlayoffLabel = (match: Match) => {
    if (match.stage !== "PLAYOFF") return match.groupName ?? "-";
    if (match.isBronzeMatch) return "Bronce";
    const roundNumber = match.roundNumber ?? null;
    const bracketSize = bracketSizeByCategory.get(match.categoryId) ?? null;
    const roundNumbers = playoffRoundsByCategory.get(match.categoryId) ?? null;
    if (!roundNumber || !bracketSize || !roundNumbers) return "Playoff";
    const roundIndex = roundNumbers.indexOf(roundNumber);
    const normalizedRound = roundIndex >= 0 ? roundIndex + 1 : roundNumber;
    return formatPlayoffRoundLabel(bracketSize, normalizedRound);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(1200px_circle_at_10%_20%,rgba(59,130,246,0.25),transparent_55%),radial-gradient(900px_circle_at_90%_0%,rgba(14,165,233,0.25),transparent_50%)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
                Torneo
              </p>
              <h1
                className="mt-3 text-4xl font-semibold text-white"
                style={{ fontFamily: "'Merriweather', serif" }}
              >
                {tournament.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-200/80">
                {tournament.description ||
                  "Informacion oficial del torneo y detalles para los jugadores."}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-200">
              <div className="h-16 w-24 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                {tournament.league?.photoUrl ? (
                  <img
                    src={tournament.league.photoUrl}
                    alt={tournament.league.name}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                    Sin foto
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-white">
                  {tournament.league?.name ?? "Sin liga"}
                </p>
                <p className="mt-1 text-slate-300">
                  {tournament.sport?.name ?? "Sin deporte"}
                </p>
                <p className="mt-1 text-slate-300">
                  Inicio: {formatDateShort(tournament.startDate)}
                </p>
              </div>
            </div>
          </div>

          {tournament.sponsors.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              {tournament.sponsors.map((sponsor, index) => {
                const content = (
                  <div className="flex h-14 w-32 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 py-2">
                    <img
                      src={sponsor.imageUrl}
                      alt={sponsor.name ?? `Auspiciador ${index + 1}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                );
                if (sponsor.linkUrl) {
                  return (
                    <a
                      key={`${sponsor.imageUrl}-${index}`}
                      href={sponsor.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {content}
                    </a>
                  );
                }
                return (
                  <div key={`${sponsor.imageUrl}-${index}`}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${
                tab === item.key
                  ? "bg-cyan-400/90 text-slate-900"
                  : "border border-white/10 bg-white/5 text-slate-200/80"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <section className="mt-8">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">Reglas</h2>
                {tournament.rulesText ? (
                  <div
                    className="prose prose-invert mt-4 max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: tournament.rulesText }}
                  />
                ) : (
                  <p className="mt-4 text-sm text-slate-300">
                    Sin reglas publicadas.
                  </p>
                )}
              </div>
              <div className="space-y-6">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-lg font-semibold text-white">Fechas clave</h2>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    <p>Inicio: {formatDateLong(tournament.startDate)}</p>
                    <p>Fin: {formatDateLong(tournament.endDate)}</p>
                    <p>
                      Cierre inscripciones: {formatDateLong(tournament.registrationDeadline)}
                    </p>
                    <div>
                      <p className="mt-4 font-semibold text-white">Dias de juego</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tournament.playDays.map((day) => (
                          <span
                            key={day}
                            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-200"
                          >
                            {formatDateShort(day)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-lg font-semibold text-white">Sedes</h2>
                  <div className="mt-4 space-y-3 text-sm text-slate-300">
                    {tournament.clubs.map((club) => (
                      <div
                        key={club.id}
                        className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3"
                      >
                        <p className="font-semibold text-white">{club.name}</p>
                        <p>{club.address ?? "Sin direccion"}</p>
                        <p className="text-xs text-slate-300">
                          Canchas habilitadas: {club.courtsCount ?? 1}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                  <h2 className="text-lg font-semibold text-white">
                    Categorias disponibles
                  </h2>
                  <div className="mt-4 space-y-3 text-sm">
                    {tournament.categories.map((entry) => (
                      <div
                        key={entry.categoryId}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-white">
                            {entry.category.name}
                          </p>
                          <p className="text-xs text-slate-300">
                            {entry.category.abbreviation} - {entry.category.sport?.name ?? "N/D"}
                          </p>
                        </div>
                        <div className="text-xs text-slate-300">
                          <p>Precio 1: Bs {entry.price}</p>
                          <p>Precio 2+: Bs {entry.secondaryPrice || entry.price}</p>
                          <p>Precio hermano: Bs {entry.siblingPrice || entry.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

{tab === "participants" && (
          <section className="mt-8 space-y-6">
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Filtrar participantes
                </p>
                <input
                  type="text"
                  value={participantDraft}
                  onChange={(e) => setParticipantDraft(e.target.value)}
                  placeholder="Equipo, jugador, ciudad o pais"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setParticipantQuery(participantDraft)}
                  className="rounded-full bg-cyan-400/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900"
                >
                  Filtrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setParticipantDraft("");
                    setParticipantQuery("");
                  }}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200"
                >
                  Limpiar
                </button>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Participantes inscritos
                  </h3>
                  <p className="text-xs text-slate-300">
                    {filteredParticipantRows.length} jugadores encontrados
                  </p>
                </div>
              </div>
              {filteredParticipantRows.length === 0 ? (
                <p className="mt-4 text-sm text-slate-300">Sin inscritos.</p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {filteredParticipantRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm"
                    >
                      <div className="h-14 w-14 overflow-hidden rounded-xl border border-white/10 bg-white/10">
                        {row.player.photoUrl ? (
                          <img
                            src={row.player.photoUrl}
                            alt={row.player.firstName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            Sin foto
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">
                          {row.player.firstName} {row.player.lastName}
                        </p>
                        <p className="mt-1 text-xs text-cyan-200">
                          {row.category.name} ({row.category.abbreviation})
                        </p>
                        {row.teamName && (
                          <p className="mt-1 text-xs text-slate-300">
                            Equipo: {row.teamName}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-300">
                          {row.location || "Sin ubicacion"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "groups" && (
          <section className="mt-8 space-y-6">
            {groupSeedings.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                Aun no hay sembrado de grupos.
              </div>
            ) : (
              groupSeedings.map((entry) => (
                <div
                  key={`groups-${entry.category.id}`}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {entry.category.name}
                      </h3>
                      <p className="text-xs text-slate-300">
                        {entry.category.abbreviation}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {entry.groups.map((group) => (
                      <div
                        key={`group-table-${entry.category.id}-${group.key}`}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/10"
                      >
                        <div className="bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                          Grupo {group.key}
                        </div>
                        <table className="min-w-full text-xs text-slate-200">
                          <thead className="bg-white/5 uppercase tracking-[0.2em] text-slate-300">
                            <tr>
                              <th className="px-3 py-2 text-left">Ranking</th>
                              <th className="px-3 py-2 text-left">Jugador/Equipo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {group.list.map((registration) => (
                              <tr key={registration.id}>
                                <td className="px-3 py-2">
                                  {registration.rankingNumber ?? "-"}
                                </td>
                                <td className="px-3 py-2">
                                  <p className="font-semibold text-white">
                                    {teamLabel(registration)}
                                  </p>
                                  <p className="mt-1 text-[11px] text-slate-300">
                                    {teamMembersLabel(registration)}
                                  </p>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "fixture" && (
          <section className="mt-8 space-y-6">
            {matchesError && (
              <p className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {matchesError}
              </p>
            )}
            {Array.from(matchesByDate.entries()).map(([dateKey, matches]) => (
              <div
                key={`fixture-${dateKey}`}
                className="rounded-3xl border border-white/10 bg-white/5 p-6"
              >
                <h3 className="text-lg font-semibold text-white">
                  {dateKey === "sin-fecha"
                    ? "Sin fecha asignada"
                    : formatDateLong(dateKey)}
                </h3>
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
                  <table className="min-w-full text-xs text-slate-200">
                    <thead className="bg-white/10 uppercase tracking-[0.2em] text-slate-300">
                      <tr>
                        <th className="px-3 py-2 text-left">Hora</th>
                        <th className="px-3 py-2 text-left">Club</th>
                        <th className="px-3 py-2 text-left">Cancha</th>
                        <th className="px-3 py-2 text-left">Categoria</th>
                        <th className="px-3 py-2 text-left">Grupo</th>
                        <th className="px-3 py-2 text-left">Equipo 1</th>
                        <th className="px-3 py-2 text-left">VS</th>
                        <th className="px-3 py-2 text-left">Equipo 2</th>
                        <th className="px-3 py-2 text-left">Marcador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {matches.map((match) => {
                        const category =
                          match.category ?? categoriesById.get(match.categoryId);
                        const score = formatMatchScore(match);
                        const isLive = Boolean(match.liveState?.isLive);
                        const drawType =
                          categoryDrawTypeById.get(match.categoryId) ?? null;
                        const isPlayoffWaiting =
                          match.stage === "PLAYOFF" &&
                          drawType === "GROUPS_PLAYOFF" &&
                          !(groupStageCompleteByCategory.get(match.categoryId) ?? false);
                        const teamAKey = `${match.id}-A`;
                        const teamBKey = `${match.id}-B`;
                        const teamAMembers = getTeamMembers(match.teamA);
                        const teamBMembers = getTeamMembers(match.teamB);
                        const canExpandTeamA =
                          teamAMembers.length > 1 ||
                          (teamAMembers.length > 0 && Boolean(match.teamA?.teamName));
                        const canExpandTeamB =
                          teamBMembers.length > 1 ||
                          (teamBMembers.length > 0 && Boolean(match.teamB?.teamName));
                        const isTeamAExpanded = expandedTeams.has(teamAKey);
                        const isTeamBExpanded = expandedTeams.has(teamBKey);
                        return (
                          <tr key={match.id} className="bg-white/5">
                            <td className="px-3 py-2">
                              {match.startTime ?? "N/D"}
                            </td>
                            <td className="px-3 py-2">
                              {match.club?.name ?? "N/D"}
                            </td>
                            <td className="px-3 py-2">
                              {match.courtNumber ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {category?.abbreviation ?? "N/D"}
                            </td>
                            <td className="px-3 py-2">
                              {getPlayoffLabel(match)}
                            </td>
                            <td className="px-3 py-2 font-semibold text-white">
                              {isPlayoffWaiting ? (
                                <span className="text-xs text-slate-400">
                                  Por definir
                                </span>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span>{teamLabel(match.teamA)}</span>
                                    {canExpandTeamA && (
                                      <button
                                        type="button"
                                        onClick={() => toggleTeamExpanded(teamAKey)}
                                        className="text-[10px] font-semibold text-cyan-200"
                                        aria-label={
                                          isTeamAExpanded
                                            ? "Ocultar jugadores"
                                            : "Ver jugadores"
                                        }
                                      >
                                        {isTeamAExpanded ? "v" : ">"}
                                      </button>
                                    )}
                                  </div>
                                  {canExpandTeamA && isTeamAExpanded && (
                                    <div className="mt-1 text-[11px] text-slate-300">
                                      {teamAMembers.join(" / ")}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-400">vs</td>
                            <td className="px-3 py-2 font-semibold text-white">
                              {isPlayoffWaiting ? (
                                <span className="text-xs text-slate-400">
                                  Por definir
                                </span>
                              ) : (
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span>{teamLabel(match.teamB)}</span>
                                    {canExpandTeamB && (
                                      <button
                                        type="button"
                                        onClick={() => toggleTeamExpanded(teamBKey)}
                                        className="text-[10px] font-semibold text-cyan-200"
                                        aria-label={
                                          isTeamBExpanded
                                            ? "Ocultar jugadores"
                                            : "Ver jugadores"
                                        }
                                      >
                                        {isTeamBExpanded ? "v" : ">"}
                                      </button>
                                    )}
                                  </div>
                                  {canExpandTeamB && isTeamBExpanded && (
                                    <div className="mt-1 text-[11px] text-slate-300">
                                      {teamBMembers.join(" / ")}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-300">
                              <div className="flex items-center gap-2">
                                {score ?? "-"}
                                {isLive && (
                                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                                    En vivo
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === "standings" && (
          <section className="mt-8 space-y-6">
            {standingsByCategoryGroups.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                No hay tabla de posiciones disponible.
              </div>
            ) : (
              standingsByCategoryGroups.map((entry) => (
                <div
                  key={`standings-${entry.category.id}`}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {entry.category.name}
                      </h3>
                      <p className="text-xs text-slate-300">
                        {entry.category.abbreviation}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {entry.groups.map((group) => (
                      <div
                        key={`standings-${entry.category.id}-${group.key}`}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-white/10"
                      >
                        <div className="bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                          Grupo {group.key}
                        </div>
                        <table className="min-w-full text-[11px] text-slate-200">
                          <thead className="bg-white/5 uppercase tracking-[0.2em] text-slate-300">
                            <tr>
                              <th className="px-3 py-2 text-left">Pos</th>
                              <th className="px-3 py-2 text-left">Jugador/Equipo</th>
                              <th className="px-3 py-2 text-left">PJ</th>
                              <th className="px-3 py-2 text-left">PG</th>
                              <th className="px-3 py-2 text-left">PP</th>
                              <th className="px-3 py-2 text-left">Sets</th>
                              <th className="px-3 py-2 text-left">DS</th>
                              <th className="px-3 py-2 text-left">PF</th>
                              <th className="px-3 py-2 text-left">PC</th>
                              <th className="px-3 py-2 text-left">DP</th>
                              <th className="px-3 py-2 text-left">Pts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {group.entries.map((entryItem, index) => {
                              const registration = registrationById.get(entryItem.id);
                              const setsDiff =
                                entryItem.setsWon - entryItem.setsLost;
                              const pointsDiff =
                                entryItem.pointsWon - entryItem.pointsLost;
                              return (
                                <tr key={entryItem.id}>
                                  <td className="px-3 py-2 text-cyan-200">
                                    {index + 1}
                                  </td>
                                  <td className="px-3 py-2 font-semibold text-white">
                                    {registration ? teamLabel(registration) : "N/D"}
                                  </td>
                                  <td className="px-3 py-2">
                                    {entryItem.matchesWon + entryItem.matchesLost}
                                  </td>
                                  <td className="px-3 py-2">{entryItem.matchesWon}</td>
                                  <td className="px-3 py-2">{entryItem.matchesLost}</td>
                                  <td className="px-3 py-2">
                                    {entryItem.setsWon}-{entryItem.setsLost}
                                  </td>
                                  <td className="px-3 py-2">
                                    {setsDiff}
                                  </td>
                                  <td className="px-3 py-2">
                                    {entryItem.pointsWon}
                                  </td>
                                  <td className="px-3 py-2">
                                    {entryItem.pointsLost}
                                  </td>
                                  <td className="px-3 py-2">
                                    {pointsDiff}
                                  </td>
                                  <td className="px-3 py-2">{entryItem.points}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                  {entry.groups.length === 1 && entry.groups[0].entries.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-xs text-slate-200">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200">
                        Posiciones finales
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {entry.groups[0].entries.slice(0, 3).map((item, idx) => {
                          const reg = registrationById.get(item.id);
                          const label = reg ? teamLabel(reg) : "N/D";
                          return (
                            <div
                              key={`${item.id}-podium`}
                              className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px]"
                            >
                              {idx + 1}º {label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        )}

        {tab === "bracket" && (
          <section className="mt-8 space-y-6">
            {playoffBrackets.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                No hay llaves de playoff para mostrar.
              </div>
            ) : (
              playoffBrackets.map((entry) => (
                <div
                  key={`bracket-${entry.category.id}`}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {entry.category.name}
                      </h3>
                      <p className="text-xs text-slate-300">
                        {entry.category.abbreviation}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <BracketCanvas
                      categoryId={entry.category.id}
                      matches={entry.matches}
                      roundNumbers={entry.roundNumbers}
                      bracketSize={entry.bracketSize}
                      registrationMap={registrationMap}
                      labelByRegistration={labelByRegistration}
                      matchStatusByMatchId={entry.matchStatusByMatchId}
                      className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-3"
                      theme="dark"
                      disableSwap
                    />
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "results" && (
          <section className="mt-8 space-y-6">
            {matchesError && (
              <p className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {matchesError}
              </p>
            )}
            {resultMatches.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                Aun no hay resultados registrados.
              </div>
            ) : (
              resultMatches.map((match) => {
                const category =
                  match.category ?? categoriesById.get(match.categoryId);
                const score = formatMatchScore(match);
                const isLive = Boolean(match.liveState?.isLive);
                return (
                  <div
                    key={`result-${match.id}`}
                    className="rounded-3xl border border-white/10 bg-white/5 p-6"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                          {category?.name ?? "Categoria"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-base font-semibold text-white">
                          <span>
                            {teamLabel(match.teamA)}{" "}
                            <span className="text-slate-400">vs</span>{" "}
                            {teamLabel(match.teamB)}
                          </span>
                          {isLive && (
                            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-200">
                              En vivo
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-300">
                        <p>{match.startTime ?? "N/D"}</p>
                        <p>{formatDateShort(match.scheduledDate)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                        Marcador: {score ?? "N/D"}
                      </span>
                      {match.outcomeType && match.outcomeType !== "PLAYED" && (
                        <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs text-amber-200">
                          {match.outcomeType === "WALKOVER"
                            ? "Walkover"
                            : "Lesion"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {tab === "prizes" && (
          <section className="mt-8 space-y-6">
            {tournament.prizes.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
                Premios por definir.
              </div>
            ) : (
              prizesByCategory.map((entry, index) => (
                <div
                  key={`prize-category-${entry.category?.id ?? index}`}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">
                        Categoria
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-white">
                        {entry.category?.name ?? "Categoria"}
                      </h3>
                      {entry.category?.abbreviation && (
                        <p className="mt-1 text-xs text-slate-300">
                          {entry.category.abbreviation}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200">
                      {entry.prizes.length} premio(s)
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {entry.prizes.map((prize) => (
                      <div
                        key={prize.id}
                        className="rounded-2xl border border-white/10 bg-white/10 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {describePrizePlace(prize.placeFrom, prize.placeTo)}
                            </p>
                            <p className="mt-1 text-xs text-slate-300">
                              Desde {prize.placeFrom} hasta{" "}
                              {prize.placeTo ?? prize.placeFrom}
                            </p>
                          </div>
                          <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-200">
                            {prize.amount ? `Bs ${prize.amount}` : "Premio"}
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-slate-300">
                          {prize.prizeText ?? "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "contact" && (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Contacto</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p>Organiza: {tournament.league?.name ?? "N/D"}</p>
                <p>
                  Responsable: {tournament.owner?.name ?? "Sin nombre"}
                </p>
                <p>Correo: {tournament.owner?.email ?? "Sin correo"}</p>
                <p>Direccion: {tournament.address ?? "Sin direccion"}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-lg font-semibold text-white">Ubicacion</h2>
              <p className="mt-4 text-sm text-slate-300">
                Consulta las sedes y horarios en la pestaña de tiempos.
              </p>
            </div>
          </section>
        )}
      </div>

      <footer className="border-t border-white/10 bg-slate-950/90">
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 text-xs text-slate-300 md:grid-cols-[1.2fr_1fr_1fr]">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Soporte y contacto</p>
            <p>
              Si tienes problemas o quieres crear tu torneo, contacta a Miguel
              Arteaga: <span className="text-cyan-200">+59160021284</span>
            </p>
            <p className="text-slate-400">Ubicacion: Santa Cruz, Bolivia</p>
            <p className="text-slate-400">
              ¿Quieres ser sponsor? Escribe a{" "}
              <span className="text-cyan-200">miguelarte202@gmail.com</span>
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Politicas basicas</p>
            <ul className="space-y-2 text-slate-400">
              <li>• Los datos se usan solo para gestionar el torneo.</li>
              <li>• Los resultados publicados son responsabilidad del organizador.</li>
              <li>• No compartimos informacion con terceros sin permiso.</li>
            </ul>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Creado por</p>
            <a
              href="https://migartec.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-slate-200 transition hover:border-white/20"
            >
              <img
                src="https://migartec.com/logo_migartec.png"
                alt="Migartec"
                className="h-10 w-24 object-contain"
              />
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Migartec
                </p>
                <p className="font-semibold text-white">migartec.com</p>
              </div>
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
