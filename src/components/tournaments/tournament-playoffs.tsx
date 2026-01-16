"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CreateBracketFn = typeof import("bracketry")["createBracket"];

type DrawType = "ROUND_ROBIN" | "GROUPS_PLAYOFF" | "PLAYOFF";
type MatchStage = "GROUP" | "PLAYOFF";
type OutcomeType = "PLAYED" | "WALKOVER" | "INJURY";
type Tiebreaker =
  | "SETS_DIFF"
  | "MATCHES_WON"
  | "POINTS_PER_MATCH"
  | "POINTS_DIFF";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
};

type Registration = {
  id: string;
  categoryId: string;
  groupName: string | null;
  seed?: number | null;
  rankingNumber?: number | null;
  createdAt?: string;
  player: Player;
  partner: Player | null;
  partnerTwo: Player | null;
  teamName?: string | null;
};

type Category = {
  id: string;
  name: string;
  abbreviation: string;
  drawType: DrawType | null;
  groupQualifiers?: number | null;
};

type Match = {
  id: string;
  categoryId: string;
  groupName: string | null;
  stage: MatchStage | null;
  roundNumber: number | null;
  games?: unknown;
  winnerSide?: "A" | "B" | null;
  outcomeType?: OutcomeType | null;
  outcomeSide?: "A" | "B" | null;
  teamAId?: string | null;
  teamBId?: string | null;
  createdAt?: string;
  isBronzeMatch?: boolean | null;
};

type GroupQualifier = {
  categoryId: string;
  groupName: string;
  qualifiers: number;
};

type FixtureResponse = {
  categories: Category[];
  registrations: Registration[];
  matches: Match[];
  groupQualifiers?: GroupQualifier[];
  tournamentStatus?: "WAITING" | "ACTIVE" | "FINISHED";
  sessionRole?: "ADMIN" | "TOURNAMENT_ADMIN";
  groupPoints?: {
    winPoints?: number;
    winWithoutGameLossPoints?: number;
    lossPoints?: number;
    lossWithGameWinPoints?: number;
    tiebreakerOrder?: string[];
  };
};

type Props = {
  tournamentId: string;
  tournamentName: string;
  onStatusChange?: (status: "WAITING" | "ACTIVE" | "FINISHED") => void;
};

type StandingEntry = {
  id: string;
  categoryId: string;
  groupName: string;
  points: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  seed: number | null;
  rankingNumber: number | null;
  createdAt: Date;
};

const playoffDrawTypes = new Set<DrawType>(["PLAYOFF", "GROUPS_PLAYOFF"]);
const groupDrawTypes = new Set<DrawType>(["ROUND_ROBIN", "GROUPS_PLAYOFF"]);
const DEFAULT_TIEBREAKERS: Tiebreaker[] = [
  "SETS_DIFF",
  "MATCHES_WON",
  "POINTS_PER_MATCH",
  "POINTS_DIFF",
];

const formatTeamName = (registration?: Registration) => {
  if (!registration) return "N/D";
  const teamName = registration.teamName?.trim();
  const players = [
    registration.player,
    registration.partner,
    registration.partnerTwo,
  ].filter(Boolean) as Player[];
  const playersLabel = players
    .map((player) => `${player.firstName} ${player.lastName}`.trim())
    .join(" / ");
  if (teamName) {
    return playersLabel ? `${teamName} (${playersLabel})` : teamName;
  }
  return playersLabel || "N/D";
};

const formatOrdinal = (value: number) => {
  if (value === 1) return "1ro";
  if (value === 2) return "2do";
  if (value === 3) return "3ro";
  return `${value}to`;
};

const normalizeGroupName = (value?: string | null) => value?.trim() || "A";

const normalizeTiebreakerOrder = (value?: string[]) => {
  const filtered = Array.isArray(value)
    ? value.filter((item): item is Tiebreaker =>
        DEFAULT_TIEBREAKERS.includes(item as Tiebreaker)
      )
    : [];
  const unique = Array.from(new Set(filtered));
  const hasAll = DEFAULT_TIEBREAKERS.every((item) => unique.includes(item));
  if (!hasAll || unique.length !== DEFAULT_TIEBREAKERS.length) {
    return [...DEFAULT_TIEBREAKERS];
  }
  return unique;
};

const parseGames = (value: unknown) => {
  if (!Array.isArray(value)) return [] as { a: number; b: number }[];
  const games: { a: number; b: number }[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const a = (entry as { a?: unknown }).a;
    const b = (entry as { b?: unknown }).b;
    if (typeof a !== "number" || typeof b !== "number") continue;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    games.push({ a, b });
  }
  return games;
};

const computeMatchResult = (games: { a: number; b: number }[]) => {
  if (games.length === 0) return null;
  let setsA = 0;
  let setsB = 0;
  let pointsA = 0;
  let pointsB = 0;
  for (const game of games) {
    pointsA += game.a;
    pointsB += game.b;
    if (game.a > game.b) {
      setsA += 1;
    } else if (game.b > game.a) {
      setsB += 1;
    }
  }
  if (setsA === 0 && setsB === 0) return null;
  if (setsA === setsB) return null;
  return {
    setsA,
    setsB,
    pointsA,
    pointsB,
    winner: setsA > setsB ? "A" : "B",
  } as const;
};

const compareStandings = (
  a: StandingEntry,
  b: StandingEntry,
  order: Tiebreaker[]
) => {
  const metrics: Record<Tiebreaker, (item: StandingEntry) => number> = {
    SETS_DIFF: (item) => item.setsWon - item.setsLost,
    MATCHES_WON: (item) => item.matchesWon,
    POINTS_PER_MATCH: (item) => item.points,
    POINTS_DIFF: (item) => item.pointsWon - item.pointsLost,
  };
  for (const rule of order) {
    const diff = metrics[rule](b) - metrics[rule](a);
    if (diff !== 0) return diff;
  }
  const seedA = a.seed ?? a.rankingNumber ?? Number.MAX_SAFE_INTEGER;
  const seedB = b.seed ?? b.rankingNumber ?? Number.MAX_SAFE_INTEGER;
  if (seedA !== seedB) return seedA - seedB;
  return a.createdAt.getTime() - b.createdAt.getTime();
};

const formatPlayoffRoundLabel = (roundSize: number, roundNumber: number) => {
  if (roundSize === 2) return "Final";
  if (roundSize === 4) return "Semifinal";
  if (roundSize === 8) return "Cuartos";
  if (roundSize === 16) return "Ronda de 16";
  if (roundSize === 32) return "Ronda de 32";
  if (roundSize === 64) return "Ronda de 64";
  if (roundSize > 1) return `Ronda de ${roundSize}`;
  return `Ronda ${roundNumber}`;
};

type BracketContestant = {
  players: { title: string }[];
  entryStatus?: string;
};

type BracketSide = {
  contestantId?: string;
  isWinner?: boolean;
  title?: string;
};

type BracketMatchEntry = {
  roundIndex: number;
  order: number;
  sides: BracketSide[];
  matchStatus?: string;
  matchId?: string;
};

type BracketBuildParams = {
  categoryId: string;
  bracketSize?: number;
  matches: Match[];
  roundNumbers: number[];
  roundLabelMap?: Map<number, string>;
  registrationMap: Map<string, Registration>;
  labelByRegistration: Map<string, string>;
};

const buildBracketData = ({
  categoryId,
  bracketSize,
  matches,
  roundNumbers,
  roundLabelMap,
  registrationMap,
  labelByRegistration,
}: BracketBuildParams) => {
  const contestants: Record<string, BracketContestant> = {};
  const ensureRegistrationContestant = (id: string) => {
    if (contestants[id]) return;
    const registration = registrationMap.get(id);
    const title =
      formatTeamName(registration) ||
      (registration ? "Equipo" : "Participante sin datos");
    contestants[id] = {
      players: [{ title }],
      entryStatus: labelByRegistration.get(id) ?? undefined,
    };
  };
  const ensurePlaceholderContestant = (id: string, title: string) => {
    if (contestants[id]) return;
    contestants[id] = {
      players: [{ title }],
    };
  };
  matches.forEach((match) => {
    if (match.teamAId) ensureRegistrationContestant(match.teamAId);
    if (match.teamBId) ensureRegistrationContestant(match.teamBId);
  });

  const normalizedRoundNumbers =
    roundNumbers.length > 0 ? roundNumbers : [matches[0]?.roundNumber ?? 1];
  const roundIndexMap = new Map<number, number>();
  normalizedRoundNumbers.forEach((roundNumber, index) => {
    roundIndexMap.set(roundNumber, index);
  });

  const rounds = normalizedRoundNumbers.map((roundNumber, index) => {
    const roundSize =
      typeof bracketSize === "number"
        ? Math.max(2, Math.round(bracketSize / 2 ** index) || 2)
        : 2;
    return {
      name:
        roundLabelMap?.get(roundNumber) ??
        formatPlayoffRoundLabel(roundSize, roundNumber),
    };
  });

  const orderTracker = new Map<number, number>();
  const bracketMatches: BracketMatchEntry[] = matches
    .slice()
    .sort((a, b) => {
      const roundA =
        roundIndexMap.get(a.roundNumber ?? normalizedRoundNumbers[0]) ?? 0;
      const roundB =
        roundIndexMap.get(b.roundNumber ?? normalizedRoundNumbers[0]) ?? 0;
      if (roundA !== roundB) return roundA - roundB;
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    })
    .map((match) => {
      const roundNumber = match.roundNumber ?? normalizedRoundNumbers[0];
      const roundIndex = roundIndexMap.get(roundNumber) ?? 0;
      const nextOrder = orderTracker.get(roundNumber) ?? 0;
      orderTracker.set(roundNumber, nextOrder + 1);
      const winnerSide = match.winnerSide ?? null;

      const buildSide = (
        teamId: string | null | undefined,
        sideIndex: 0 | 1,
        roundIndexValue: number,
        hasOpponent: boolean
      ): BracketSide => {
        if (teamId) {
          return {
            contestantId: teamId,
            isWinner:
              winnerSide === (sideIndex === 0 ? "A" : "B") ? true : undefined,
          };
        }
        if (roundIndexValue === 0) {
          if (hasOpponent) {
            const byeId = `bye-${categoryId}-${match.id}-${sideIndex}`;
            ensurePlaceholderContestant(byeId, "Bye");
            return { contestantId: byeId };
          }
          const emptyId = `empty-${categoryId}-${match.id}-${sideIndex}`;
          ensurePlaceholderContestant(emptyId, "Disponible");
          return { contestantId: emptyId };
        }
        const pendingId = `pending-${categoryId}-${match.id}-${sideIndex}`;
        ensurePlaceholderContestant(pendingId, "Por definir");
        return { contestantId: pendingId };
      };

      const hasTeamA = Boolean(match.teamAId);
      const hasTeamB = Boolean(match.teamBId);

      return {
        roundIndex,
        order: nextOrder,
        sides: [
          buildSide(match.teamAId, 0, roundIndex, hasTeamB),
          buildSide(match.teamBId, 1, roundIndex, hasTeamA),
        ],
        matchStatus: roundLabelMap?.get(roundNumber),
        matchId: match.id,
      };
    });

  return {
    contestants,
    rounds,
    matches: bracketMatches,
  };
};

type BracketCanvasProps = {
  categoryId: string;
  matches: Match[];
  roundNumbers: number[];
  roundLabelMap?: Map<number, string>;
  bracketSize?: number;
  registrationMap: Map<string, Registration>;
  labelByRegistration: Map<string, string>;
  onSwapSides?: (
    from: { matchId: string; side: "A" | "B" },
    to: { matchId: string; side: "A" | "B" }
  ) => Promise<void>;
  disableSwap?: boolean;
};

type DragInfo = {
  matchId: string;
  side: "A" | "B";
  contestantId: string | null;
  roundIndex: number;
  order: number;
};

type BracketInstance = ReturnType<CreateBracketFn>;

const bracketOptions = {
  width: "100%",
  height: "420px",
  rootBorderColor: "transparent",
  wrapperBorderColor: "transparent",
  rootBgColor: "transparent",
  matchTextColor: "#0f172a",
  connectionLinesColor: "rgba(79,70,229,0.35)",
  highlightedConnectionLinesColor: "#6366f1",
  matchStatusBgColor: "#eef2ff",
  verticalScrollMode: "native" as const,
  navButtonsPosition: "hidden" as const,
  rootFontFamily: "Inter, system-ui, sans-serif",
  matchFontSize: 12,
  distanceBetweenScorePairs: 6,
  matchMinVerticalGap: 18,
  matchHorMargin: 12,
};

const BracketCanvas = ({
  categoryId,
  matches,
  roundNumbers,
  roundLabelMap,
  bracketSize,
  registrationMap,
  labelByRegistration,
  onSwapSides,
  disableSwap,
}: BracketCanvasProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const bracketRef = useRef<BracketInstance | null>(null);
  const createBracketRef = useRef<CreateBracketFn | null>(null);
  const data = useMemo(
    () =>
      buildBracketData({
        categoryId,
        bracketSize,
        matches,
        roundNumbers,
        roundLabelMap,
        registrationMap,
        labelByRegistration,
      }),
    [
      categoryId,
      bracketSize,
      matches,
      roundNumbers,
      roundLabelMap,
      registrationMap,
      labelByRegistration,
    ]
  );
  const matchKeyToId = useMemo(() => {
    const map = new Map<string, string>();
    data.matches.forEach((match) => {
      if (match.matchId) {
        map.set(`${match.roundIndex}:${match.order}`, match.matchId);
      }
    });
    return map;
  }, [data.matches]);
  const dragInfoRef = useRef<DragInfo | null>(null);
  const swapInFlightRef = useRef(false);
  const syncDraggable = () => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const canSwap = Boolean(onSwapSides) && !disableSwap;
    const scroller = wrapper.querySelector<HTMLElement>(".matches-scroller");
    if (scroller) {
      scroller.style.pointerEvents = "auto";
    }
    const sideElements = wrapper.querySelectorAll<HTMLElement>(".side-wrapper");
    sideElements.forEach((side) => {
      const contestantId = side.getAttribute("contestant-id");
      const isPlaceholder =
        contestantId?.startsWith("bye-") ||
        contestantId?.startsWith("empty-") ||
        contestantId?.startsWith("pending-");
      const isDraggable = canSwap && Boolean(contestantId) && !isPlaceholder;
      side.style.pointerEvents = "auto";
      side.style.cursor = isDraggable ? "grab" : "default";
      side.setAttribute("draggable", isDraggable ? "true" : "false");
      side
        .querySelectorAll<HTMLElement>(
          ".players-info, .player-wrapper, .player-title"
        )
        .forEach((child) => {
          child.setAttribute("draggable", isDraggable ? "true" : "false");
        });
    });
  };

  useEffect(() => {
    let active = true;
    const install = async () => {
      if (data.matches.length === 0) {
        bracketRef.current?.uninstall();
        bracketRef.current = null;
        return;
      }
      if (!wrapperRef.current) return;
      if (!createBracketRef.current) {
        const bracketryModule = await import("bracketry");
        if (!active) return;
        createBracketRef.current = bracketryModule.createBracket;
      }
      const createBracket = createBracketRef.current;
      if (!createBracket) return;
      if (bracketRef.current) {
        bracketRef.current.replaceData(data);
      } else {
        bracketRef.current = createBracket(
          data,
          wrapperRef.current,
          bracketOptions
        );
      }
      requestAnimationFrame(() => {
        syncDraggable();
      });
    };
    void install();
    return () => {
      active = false;
    };
  }, [data]);

  useEffect(() => {
    syncDraggable();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new MutationObserver(() => {
      syncDraggable();
    });
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, [data, onSwapSides, disableSwap]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !onSwapSides) return;
    if (disableSwap) return;

    const getSideInfo = (element: HTMLElement): DragInfo | null => {
      const matchElement = element.closest(".match-wrapper");
      const roundElement = element.closest(".round-wrapper");
      if (!matchElement || !roundElement) return null;
      const roundIndex = roundElement.getAttribute("round-index");
      const order = matchElement.getAttribute("match-order");
      if (!roundIndex || !order) return null;
      const matchId = matchKeyToId.get(`${roundIndex}:${order}`);
      if (!matchId) return null;
      const parent = element.parentElement;
      const sideIndex = parent?.firstElementChild === element ? 0 : 1;
      const contestantId = element.getAttribute("contestant-id");
      return {
        matchId,
        side: sideIndex === 0 ? "A" : "B",
        contestantId:
          contestantId?.startsWith("bye-") ||
          contestantId?.startsWith("empty-") ||
          contestantId?.startsWith("pending-")
            ? null
            : contestantId,
        roundIndex: Number(roundIndex),
        order: Number(order),
      };
    };

    const handleDragStart = (event: DragEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        ".side-wrapper"
      ) as HTMLElement | null;
      if (!target) return;
      const info = getSideInfo(target);
      if (!info || !info.contestantId) return;
      dragInfoRef.current = info;
      event.dataTransfer?.setData(
        "application/json",
        JSON.stringify({ matchId: info.matchId, side: info.side })
      );
      event.dataTransfer?.setData("text/plain", info.matchId);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    };

    const handleDragOver = (event: DragEvent) => {
      if (!dragInfoRef.current) return;
      const target = (event.target as HTMLElement | null)?.closest(
        ".side-wrapper"
      ) as HTMLElement | null;
      if (!target) return;
      const info = getSideInfo(target);
      if (!info) return;
      if (
        info.matchId === dragInfoRef.current.matchId &&
        info.side === dragInfoRef.current.side
      ) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
    };

    const handleDrop = async (event: DragEvent) => {
      const source = dragInfoRef.current;
      dragInfoRef.current = null;
      if (!source) return;
      event.preventDefault();
      const target = (event.target as HTMLElement | null)?.closest(
        ".side-wrapper"
      ) as HTMLElement | null;
      if (!target) return;
      const info = getSideInfo(target);
      if (!info) return;
      if (source.matchId === info.matchId && source.side === info.side) {
        return;
      }
      if (swapInFlightRef.current) return;
      swapInFlightRef.current = true;
      try {
        await onSwapSides(
          { matchId: source.matchId, side: source.side },
          { matchId: info.matchId, side: info.side }
        );
      } finally {
        swapInFlightRef.current = false;
      }
    };

    const handleDragEnd = () => {
      dragInfoRef.current = null;
    };

    wrapper.addEventListener("dragstart", handleDragStart, true);
    wrapper.addEventListener("dragover", handleDragOver, true);
    wrapper.addEventListener("drop", handleDrop, true);
    wrapper.addEventListener("dragend", handleDragEnd, true);
    return () => {
      wrapper.removeEventListener("dragstart", handleDragStart, true);
      wrapper.removeEventListener("dragover", handleDragOver, true);
      wrapper.removeEventListener("drop", handleDrop, true);
      wrapper.removeEventListener("dragend", handleDragEnd, true);
    };
  }, [matchKeyToId, onSwapSides, disableSwap]);

  useEffect(() => {
    return () => {
      bracketRef.current?.uninstall();
      bracketRef.current = null;
    };
  }, []);

  return (
    <div className="flex min-h-[420px] w-full items-center justify-center">
      <div
        ref={wrapperRef}
        className="w-full"
        style={{ width: "100%", minHeight: "420px" }}
      />
    </div>
  );
};

const nextPowerOfTwo = (value: number) => {
  if (value <= 1) return 1;
  let size = 1;
  while (size < value) size *= 2;
  return size;
};

export default function TournamentPlayoffs({
  tournamentId,
  tournamentName,
  onStatusChange,
}: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [groupQualifiers, setGroupQualifiers] = useState<GroupQualifier[]>([]);
  const [groupPoints, setGroupPoints] = useState({
    winPoints: 0,
    winWithoutGameLossPoints: 0,
    lossPoints: 0,
    lossWithGameWinPoints: 0,
    tiebreakerOrder: [...DEFAULT_TIEBREAKERS],
  });
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [tournamentStatus, setTournamentStatus] = useState<
    "WAITING" | "ACTIVE" | "FINISHED"
  >("WAITING");
  const [sessionRole, setSessionRole] = useState<"ADMIN" | "TOURNAMENT_ADMIN">(
    "TOURNAMENT_ADMIN"
  );
  const loadData = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/tournaments/${tournamentId}/fixtures`, {
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as FixtureResponse;
    setLoading(false);
    if (!res.ok) {
      const detail = (data as { detail?: string })?.detail
        ? ` (${(data as { detail?: string }).detail})`
        : "";
      setError(
        `${(data as { error?: string })?.error ?? "No se pudieron cargar los playoffs"}${detail}`
      );
      return;
    }

    setCategories(Array.isArray(data.categories) ? data.categories : []);
    setRegistrations(Array.isArray(data.registrations) ? data.registrations : []);
    setMatches(Array.isArray(data.matches) ? data.matches : []);
    setGroupQualifiers(
      Array.isArray(data.groupQualifiers) ? data.groupQualifiers : []
    );
    if (data.tournamentStatus) {
      setTournamentStatus(data.tournamentStatus);
    }
    if (data.sessionRole) {
      setSessionRole(data.sessionRole);
    }
    if (data.groupPoints) {
      setGroupPoints({
        winPoints:
          typeof data.groupPoints.winPoints === "number"
            ? data.groupPoints.winPoints
            : 0,
        winWithoutGameLossPoints:
          typeof data.groupPoints.winWithoutGameLossPoints === "number"
            ? data.groupPoints.winWithoutGameLossPoints
            : 0,
        lossPoints:
          typeof data.groupPoints.lossPoints === "number"
            ? data.groupPoints.lossPoints
            : 0,
        lossWithGameWinPoints:
          typeof data.groupPoints.lossWithGameWinPoints === "number"
            ? data.groupPoints.lossWithGameWinPoints
            : 0,
        tiebreakerOrder: normalizeTiebreakerOrder(
          data.groupPoints.tiebreakerOrder
        ),
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const registrationMap = useMemo(() => {
    const map = new Map<string, Registration>();
    registrations.forEach((registration) => {
      map.set(registration.id, registration);
    });
    return map;
  }, [registrations]);

  const qualifiersByGroup = useMemo(() => {
    const map = new Map<string, number>();
    groupQualifiers.forEach((entry) => {
      const key = `${entry.categoryId}:${normalizeGroupName(entry.groupName)}`;
      map.set(key, entry.qualifiers);
    });
    return map;
  }, [groupQualifiers]);

  const playoffCategories = useMemo(
    () => categories.filter((category) => playoffDrawTypes.has(category.drawType)),
    [categories]
  );

  const registrationsByCategory = useMemo(() => {
    const map = new Map<string, Registration[]>();
    registrations.forEach((registration) => {
      if (!map.has(registration.categoryId)) {
        map.set(registration.categoryId, []);
      }
      map.get(registration.categoryId)?.push(registration);
    });
    return map;
  }, [registrations]);

  const qualifiedCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    playoffCategories.forEach((category) => {
      if (category.drawType === "PLAYOFF") {
        map.set(
          category.id,
          registrationsByCategory.get(category.id)?.length ?? 0
        );
        return;
      }
      const categoryRegistrations =
        registrationsByCategory.get(category.id) ?? [];
      const groupCounts = new Map<string, number>();
      categoryRegistrations.forEach((registration) => {
        const groupName = normalizeGroupName(registration.groupName);
        groupCounts.set(groupName, (groupCounts.get(groupName) ?? 0) + 1);
      });
      let total = 0;
      const defaultQualifiers =
        typeof category.groupQualifiers === "number" &&
        category.groupQualifiers > 0
          ? category.groupQualifiers
          : 2;
      groupCounts.forEach((count, groupName) => {
        const qualifiers =
          qualifiersByGroup.get(`${category.id}:${groupName}`) ??
          defaultQualifiers;
        total += Math.min(count, Math.max(1, qualifiers));
      });
      map.set(category.id, total);
    });
    return map;
  }, [playoffCategories, registrationsByCategory, qualifiersByGroup]);

  const bracketSizeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    qualifiedCountByCategory.forEach((count, categoryId) => {
      if (count > 1) {
        map.set(categoryId, nextPowerOfTwo(count));
      }
    });
    return map;
  }, [qualifiedCountByCategory]);

  const groupMatches = useMemo(
    () => matches.filter((match) => match.stage === "GROUP"),
    [matches]
  );

  const labelByRegistration = useMemo(() => {
    const labelMap = new Map<string, string>();
    const groupCategories = categories.filter((category) =>
      groupDrawTypes.has(category.drawType)
    );
    if (groupCategories.length === 0) return labelMap;

    const standingsByCategory = new Map<string, Map<string, StandingEntry[]>>();

    groupCategories.forEach((category) => {
      standingsByCategory.set(category.id, new Map());
    });

    const standingsById = new Map<string, StandingEntry>();

    registrations.forEach((registration) => {
      if (!standingsByCategory.has(registration.categoryId)) return;
      const createdAt = registration.createdAt
        ? new Date(registration.createdAt)
        : new Date(0);
      const entry: StandingEntry = {
        id: registration.id,
        categoryId: registration.categoryId,
        groupName: normalizeGroupName(registration.groupName),
        points: 0,
        matchesWon: 0,
        matchesLost: 0,
        setsWon: 0,
        setsLost: 0,
        pointsWon: 0,
        pointsLost: 0,
        seed: registration.seed ?? null,
        rankingNumber: registration.rankingNumber ?? null,
        createdAt,
      };
      standingsById.set(registration.id, entry);
      const groups = standingsByCategory.get(registration.categoryId);
      if (!groups) return;
      if (!groups.has(entry.groupName)) {
        groups.set(entry.groupName, []);
      }
      groups.get(entry.groupName)?.push(entry);
    });

    groupMatches.forEach((match) => {
      if (!standingsByCategory.has(match.categoryId)) return;
      const teamA = match.teamAId
        ? standingsById.get(match.teamAId)
        : undefined;
      const teamB = match.teamBId
        ? standingsById.get(match.teamBId)
        : undefined;
      if (!teamA || !teamB) return;

      const outcomeType = match.outcomeType ?? "PLAYED";
      const outcomeSide = match.outcomeSide ?? null;

      if (outcomeType !== "PLAYED") {
        const winnerSide =
          outcomeSide === "A"
            ? "B"
            : outcomeSide === "B"
            ? "A"
            : match.winnerSide ?? null;
        if (!winnerSide) return;
        if (winnerSide === "A") {
          teamA.matchesWon += 1;
          teamB.matchesLost += 1;
          teamA.points += groupPoints.winWithoutGameLossPoints;
          teamB.points += groupPoints.lossPoints;
        } else {
          teamB.matchesWon += 1;
          teamA.matchesLost += 1;
          teamB.points += groupPoints.winWithoutGameLossPoints;
          teamA.points += groupPoints.lossPoints;
        }
        return;
      }

      const result = computeMatchResult(parseGames(match.games));
      if (result) {
        teamA.setsWon += result.setsA;
        teamA.setsLost += result.setsB;
        teamA.pointsWon += result.pointsA;
        teamA.pointsLost += result.pointsB;
        teamB.setsWon += result.setsB;
        teamB.setsLost += result.setsA;
        teamB.pointsWon += result.pointsB;
        teamB.pointsLost += result.pointsA;

        if (result.winner === "A") {
          teamA.matchesWon += 1;
          teamB.matchesLost += 1;
          teamA.points +=
            result.setsB === 0
              ? groupPoints.winWithoutGameLossPoints
              : groupPoints.winPoints;
          teamB.points +=
            result.setsB > 0
              ? groupPoints.lossWithGameWinPoints
              : groupPoints.lossPoints;
        } else {
          teamB.matchesWon += 1;
          teamA.matchesLost += 1;
          teamB.points +=
            result.setsA === 0
              ? groupPoints.winWithoutGameLossPoints
              : groupPoints.winPoints;
          teamA.points +=
            result.setsA > 0
              ? groupPoints.lossWithGameWinPoints
              : groupPoints.lossPoints;
        }
        return;
      }

      if (match.winnerSide) {
        if (match.winnerSide === "A") {
          teamA.matchesWon += 1;
          teamB.matchesLost += 1;
          teamA.points += groupPoints.winPoints;
          teamB.points += groupPoints.lossPoints;
        } else {
          teamB.matchesWon += 1;
          teamA.matchesLost += 1;
          teamB.points += groupPoints.winPoints;
          teamA.points += groupPoints.lossPoints;
        }
      }
    });

    standingsByCategory.forEach((groups) => {
      groups.forEach((entries, groupName) => {
        const ordered = [...entries].sort((a, b) =>
          compareStandings(a, b, groupPoints.tiebreakerOrder)
        );
        ordered.forEach((entry, index) => {
          labelMap.set(entry.id, `${formatOrdinal(index + 1)} Grupo ${groupName}`);
        });
      });
    });

    return labelMap;
  }, [categories, registrations, groupMatches, groupPoints]);

  const playoffMatchesByCategory = useMemo(() => {
    const map = new Map<string, Match[]>();
    matches
      .filter((match) => match.stage === "PLAYOFF")
      .forEach((match) => {
        if (!map.has(match.categoryId)) {
          map.set(match.categoryId, []);
        }
        map.get(match.categoryId)?.push(match);
      });
    return map;
  }, [matches]);

  const playoffRoundLabels = useMemo(() => {
    const map = new Map<string, Map<number, string>>();
    playoffMatchesByCategory.forEach((list, categoryId) => {
      const roundCounts = new Map<number, number>();
      list.forEach((match) => {
        const round = match.roundNumber ?? 1;
        roundCounts.set(round, (roundCounts.get(round) ?? 0) + 1);
      });
      const rounds = Array.from(roundCounts.keys()).sort((a, b) => a - b);
      if (rounds.length === 0) return;
      const firstRound = rounds[0];
      const firstCount = roundCounts.get(firstRound) ?? 0;
      const bracketSize = firstCount * 2;
      const labelMap = new Map<number, string>();
      rounds.forEach((round) => {
        const roundSize = Math.round(
          bracketSize / 2 ** (round - firstRound)
        );
        labelMap.set(round, formatPlayoffRoundLabel(roundSize, round));
      });
      map.set(categoryId, labelMap);
    });
    return map;
  }, [playoffMatchesByCategory]);

  const handleGenerate = async (
    categoryId?: string,
    regenerate?: boolean
  ) => {
    setGenerating(categoryId ?? "ALL");
    setError(null);
    setMessage(null);

    const res = await fetch(`/api/tournaments/${tournamentId}/fixtures/playoffs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(
        categoryId ? { categoryId, regenerate: Boolean(regenerate) } : {}
      ),
    });

    const data = await res.json().catch(() => ({}));
    setGenerating(null);

    if (!res.ok) {
      const detail = data?.detail ? ` (${data.detail})` : "";
      setError(`${data?.error ?? "No se pudieron generar las llaves"}${detail}`);
      return;
    }

    await loadData();
    setMessage("Llaves generadas");
  };

  const handleSwapSides = async (
    from: { matchId: string; side: "A" | "B" },
    to: { matchId: string; side: "A" | "B" }
  ) => {
    if (swapping) return;
    setSwapping(true);
    setError(null);
    setMessage(null);

    const res = await fetch(
      `/api/tournaments/${tournamentId}/fixtures/playoffs/swap`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ from, to }),
      }
    );

    const data = await res.json().catch(() => ({}));
    setSwapping(false);

    if (!res.ok) {
      const detail = data?.detail ? ` (${data.detail})` : "";
      setError(`${data?.error ?? "No se pudo actualizar la llave"}${detail}`);
      return;
    }

    await loadData();
    setMessage("Llave actualizada");
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando llaves...</p>;
  }

  const isMatchComplete = (match: Match) => {
    const outcomeType = match.outcomeType ?? "PLAYED";
    if (match.stage !== "GROUP" && (!match.teamAId || !match.teamBId)) {
      return false;
    }
    if (outcomeType !== "PLAYED") {
      return Boolean(match.outcomeSide || match.winnerSide);
    }
    if (match.winnerSide) return true;
    return Array.isArray(match.games) && match.games.length > 0;
  };

  const allMatchesComplete =
    matches.length > 0 && matches.every((match) => isMatchComplete(match));

  const handleFinishTournament = async () => {
    if (finishing) return;
    setError(null);
    setFinishing(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "FINISHED" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = data?.detail ? ` (${data.detail})` : "";
        throw new Error(`${data?.error ?? "No se pudo finalizar"}${detail}`);
      }
      setTournamentStatus("FINISHED");
      onStatusChange?.("FINISHED");
      setMessage("Torneo finalizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo finalizar");
    } finally {
      setFinishing(false);
    }
  };

  const hasExistingPlayoffs =
    Array.from(playoffMatchesByCategory.values()).flat().length > 0;

  return (
    <div className="space-y-8">
      <div className="admin-fade-up relative overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-indigo-300/70 via-sky-300/60 to-amber-200/70" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500">
              Paso 8
            </p>
            <h2 className="text-2xl font-semibold text-slate-900">
              Llaves de playoff
            </h2>
            <p className="text-sm text-slate-600">
              Torneo: <span className="font-semibold">{tournamentName}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tournamentStatus === "ACTIVE" &&
              (sessionRole === "ADMIN" || sessionRole === "TOURNAMENT_ADMIN") &&
              allMatchesComplete && (
              <button
                type="button"
                onClick={handleFinishTournament}
                disabled={finishing}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {finishing ? "Finalizando..." : "Terminar torneo"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (hasExistingPlayoffs) {
                  const confirmed = window.confirm(
                    "Ya existen llaves. Regenerar borrara las actuales. Continuar?"
                  );
                  if (!confirmed) return;
                }
                handleGenerate(undefined, hasExistingPlayoffs);
              }}
              disabled={generating === "ALL" || playoffCategories.length === 0}
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-[0_14px_32px_-18px_rgba(79,70,229,0.45)] transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {generating === "ALL" ? "Generando..." : "Generar llaves"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Se generan las llaves con el mejor contra el peor segun el ranking de
          grupos o el ranking del torneo cuando es eliminacion directa.
        </p>
      </div>

      {playoffCategories.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          No hay categorias con playoff.
        </p>
      ) : (
        playoffCategories.map((category) => {
          const categoryMatches =
            playoffMatchesByCategory.get(category.id) ?? [];
          const mainMatches = categoryMatches.filter(
            (match) => !match.isBronzeMatch && (match.teamAId || match.teamBId)
          );
          const bronzeMatches = categoryMatches.filter(
            (match) => match.isBronzeMatch && (match.teamAId || match.teamBId)
          );
          const roundMap = new Map<number, Match[]>();
          mainMatches.forEach((match) => {
            const round = match.roundNumber ?? 1;
            if (!roundMap.has(round)) {
              roundMap.set(round, []);
            }
            roundMap.get(round)?.push(match);
          });
          const roundNumbers = Array.from(roundMap.keys()).sort((a, b) => a - b);
          const bronzeRoundMap = new Map<number, Match[]>();
          bronzeMatches.forEach((match) => {
            const round = match.roundNumber ?? 1;
            if (!bronzeRoundMap.has(round)) {
              bronzeRoundMap.set(round, []);
            }
            bronzeRoundMap.get(round)?.push(match);
          });
          const bronzeRoundNumbers = Array.from(bronzeRoundMap.keys()).sort(
            (a, b) => a - b
          );
          const bronzeLabelMap = new Map<number, string>();
          if (bronzeRoundNumbers.length > 0) {
            bronzeLabelMap.set(bronzeRoundNumbers[0], "Bronce");
          }
          const bronzeBracketSize = Math.max(
            2,
            nextPowerOfTwo(bronzeMatches.length || 2)
          );
          const labelMap = playoffRoundLabels.get(category.id);
          const bracketSize = bracketSizeByCategory.get(category.id);
          const qualifiedCount = qualifiedCountByCategory.get(category.id) ?? 0;
          const registrationsCount =
            registrationsByCategory.get(category.id)?.length ?? 0;
          const hasCategoryPlayoffs =
            (playoffMatchesByCategory.get(category.id) ?? []).length > 0;
          const labelForBracket = new Map<string, string>();
          labelByRegistration.forEach((value, key) => {
            labelForBracket.set(key, value);
          });
          

          return (
          <div
            key={category.id}
            className="admin-fade-up space-y-5 rounded-[24px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {category.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {category.abbreviation}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {registrationsCount} inscritos
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    Clasifican: {qualifiedCount}
                  </span>
                  {bracketSize && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                      Llave de {bracketSize}
                    </span>
                  )}
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                    Arrastra para mover
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasCategoryPlayoffs) {
                        const confirmed = window.confirm(
                          "Ya existen llaves para esta categoria. Regenerar borrara las actuales. Continuar?"
                        );
                        if (!confirmed) return;
                      }
                      handleGenerate(category.id, hasCategoryPlayoffs);
                    }}
                    disabled={generating === category.id}
                    className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {generating === category.id
                      ? "Generando..."
                      : hasCategoryPlayoffs
                      ? "Regenerar llaves"
                      : "Crear llaves"}
                  </button>
                </div>
              </div>

          {mainMatches.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Todavia no hay llaves generadas para esta categoria.
            </p>
          ) : (
            <>
              {bronzeMatches.length > 0 && (
                <div className="rounded-[28px] border border-amber-100 bg-amber-50/70 p-4 text-sm text-amber-900 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em]">
                    Partido por el 3er lugar
                  </p>
                  <p className="mt-2">
                    Los perdedores de semifinales juegan aqui por el podio.
                  </p>
                </div>
              )}
              <div className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-white p-4 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)]">
                <BracketCanvas
                  categoryId={category.id}
                  matches={mainMatches}
                  roundNumbers={roundNumbers}
                  roundLabelMap={labelMap}
                  bracketSize={bracketSize}
                  registrationMap={registrationMap}
                  labelByRegistration={labelForBracket}
                  onSwapSides={handleSwapSides}
                  disableSwap={swapping}
                />
              </div>
            </>
          )}
          </div>
          );
        })
      )}

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
    </div>
  );
}








