"use client";

import { useEffect, useMemo, useRef } from "react";

type CreateBracketFn = typeof import("bracketry")["createBracket"];

type BracketPlayer = {
  firstName: string;
  lastName: string;
};

export type BracketRegistration = {
  id: string;
  teamName?: string | null;
  player?: BracketPlayer | null;
  partner?: BracketPlayer | null;
  partnerTwo?: BracketPlayer | null;
};

export type BracketMatch = {
  id: string;
  roundNumber?: number | null;
  winnerSide?: "A" | "B" | null;
  teamAId?: string | null;
  teamBId?: string | null;
  createdAt?: string;
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
  matches: BracketMatch[];
  roundNumbers: number[];
  roundLabelMap?: Map<number, string>;
  registrationMap: Map<string, BracketRegistration>;
  labelByRegistration: Map<string, string>;
  matchStatusByMatchId?: Map<string, string>;
};

const formatTeamName = (registration?: BracketRegistration) => {
  if (!registration) return "N/D";
  const teamName = registration.teamName?.trim();
  const players = [
    registration.player,
    registration.partner,
    registration.partnerTwo,
  ].filter(Boolean) as BracketPlayer[];
  const playersLabel = players
    .map((player) => `${player.firstName} ${player.lastName}`.trim())
    .join(" / ");
  if (teamName) {
    return playersLabel ? `${teamName} (${playersLabel})` : teamName;
  }
  return playersLabel || "N/D";
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

const buildBracketData = ({
  categoryId,
  bracketSize,
  matches,
  roundNumbers,
  roundLabelMap,
  registrationMap,
  labelByRegistration,
  matchStatusByMatchId,
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
      const matchStatus =
        matchStatusByMatchId?.get(match.id) ??
        roundLabelMap?.get(roundNumber);

      return {
        roundIndex,
        order: nextOrder,
        sides: [
          buildSide(match.teamAId, 0, roundIndex, hasTeamB),
          buildSide(match.teamBId, 1, roundIndex, hasTeamA),
        ],
        matchStatus,
        matchId: match.id,
      };
    });

  return {
    contestants,
    rounds,
    matches: bracketMatches,
  };
};

export type BracketCanvasProps = {
  categoryId: string;
  matches: BracketMatch[];
  roundNumbers: number[];
  roundLabelMap?: Map<number, string>;
  bracketSize?: number;
  registrationMap: Map<string, BracketRegistration>;
  labelByRegistration: Map<string, string>;
  matchStatusByMatchId?: Map<string, string>;
  className?: string;
  theme?: "light" | "dark";
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

export const BracketCanvas = ({
  categoryId,
  matches,
  roundNumbers,
  roundLabelMap,
  bracketSize,
  registrationMap,
  labelByRegistration,
  matchStatusByMatchId,
  className,
  theme = "light",
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
        matchStatusByMatchId,
      }),
    [
      categoryId,
      bracketSize,
      matches,
      roundNumbers,
      roundLabelMap,
      registrationMap,
      labelByRegistration,
      matchStatusByMatchId,
    ]
  );
  const options = useMemo(
    () => ({
      ...bracketOptions,
      matchTextColor: theme === "dark" ? "#e2e8f0" : "#03060c",
      matchStatusBgColor:
        theme === "dark" ? "transparent" : "#cdcfd7",
      roundTitleColor: theme === "dark" ? "#e2e8f0" : "#0f172a",
      roundTitlesBorderColor:
        theme === "light" ? "rgb(4, 4, 5)" : "#e2e8f000",
    }),
    [theme]
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
        bracketRef.current = createBracket(data, wrapperRef.current, options);
      }
      requestAnimationFrame(() => {
        syncDraggable();
      });
    };
    install();
    return () => {
      active = false;
    };
  }, [data, options]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const canSwap = Boolean(onSwapSides) && !disableSwap;
    if (!canSwap) {
      syncDraggable();
      return;
    }

    const handleDragStart = (event: DragEvent) => {
      const target = (event.target as HTMLElement | null)?.closest(
        ".side-wrapper"
      ) as HTMLElement | null;
      if (!target) return;
      const contestantId = target.getAttribute("contestant-id");
      if (!contestantId) return;
      const match = target.closest(".match-wrapper") as HTMLElement | null;
      if (!match) return;
      const roundIndex = Number(match.getAttribute("round-index") ?? 0);
      const order = Number(match.getAttribute("match-order") ?? 0);
      const sideIndex = Number(target.getAttribute("side-order") ?? 0);
      dragInfoRef.current = {
        matchId: matchKeyToId.get(`${roundIndex}:${order}`) ?? "",
        side: sideIndex === 0 ? "A" : "B",
        contestantId,
        roundIndex,
        order,
      };
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
      const contestantId = target.getAttribute("contestant-id");
      if (!contestantId) return;
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
      }
      event.preventDefault();
    };

    const handleDrop = async (event: DragEvent) => {
      if (!dragInfoRef.current) return;
      const target = (event.target as HTMLElement | null)?.closest(
        ".side-wrapper"
      ) as HTMLElement | null;
      if (!target) return;
      const contestantId = target.getAttribute("contestant-id");
      if (!contestantId) return;
      const match = target.closest(".match-wrapper") as HTMLElement | null;
      if (!match) return;
      const roundIndex = Number(match.getAttribute("round-index") ?? 0);
      const order = Number(match.getAttribute("match-order") ?? 0);
      const sideIndex = Number(target.getAttribute("side-order") ?? 0);
      const matchId = matchKeyToId.get(`${roundIndex}:${order}`) ?? "";
      if (!matchId) return;
      const from = dragInfoRef.current;
      if (!from.matchId) return;
      if (swapInFlightRef.current) return;
      const to = { matchId, side: sideIndex === 0 ? "A" : "B" } as const;
      if (from.matchId === to.matchId && from.side === to.side) return;
      swapInFlightRef.current = true;
      try {
        await onSwapSides?.({ matchId: from.matchId, side: from.side }, to);
      } finally {
        swapInFlightRef.current = false;
        dragInfoRef.current = null;
      }
    };

    const handleDragEnd = () => {
      dragInfoRef.current = null;
    };

    wrapper.addEventListener("dragstart", handleDragStart);
    wrapper.addEventListener("dragover", handleDragOver);
    wrapper.addEventListener("drop", handleDrop);
    wrapper.addEventListener("dragend", handleDragEnd);
    syncDraggable();
    return () => {
      wrapper.removeEventListener("dragstart", handleDragStart);
      wrapper.removeEventListener("dragover", handleDragOver);
      wrapper.removeEventListener("drop", handleDrop);
      wrapper.removeEventListener("dragend", handleDragEnd);
    };
  }, [matchKeyToId, onSwapSides, disableSwap]);

  useEffect(() => {
    syncDraggable();
  }, [disableSwap, onSwapSides]);

  const wrapperClassName = [
    className ??
      "relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm",
    theme === "dark" ? "bracket-theme-dark" : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {theme === "dark" && (
        <style jsx global>{`
          .bracket-theme-dark .match-status {
            background: transparent !important;
            box-shadow: none !important;
            color: #e2e8f0 !important;
          }
          .bracket-theme-dark .match-wrapper.highlighted .match-status {
            border-color: rgba(226, 232, 240, 0.6) !important;
          }
        `}</style>
      )}
      <div ref={wrapperRef} className={wrapperClassName} />
    </>
  );
};
