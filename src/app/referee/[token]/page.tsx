"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useParams } from "next/navigation";

type Player = {
  id: string;
  firstName: string;
  lastName: string;
};

type Registration = {
  teamName?: string | null;
  player: Player;
  partner?: Player | null;
  partnerTwo?: Player | null;
};

type MatchData = {
  id: string;
  tournamentId: string;
  categoryId: string;
  scheduledDate: string | null;
  startTime: string | null;
  games: { a: number; b: number }[] | null;
  liveState?: LiveState | null;
  winnerSide?: "A" | "B" | null;
  outcomeType?: string | null;
  outcomeSide?: "A" | "B" | null;
  stage?: string | null;
  isBronzeMatch?: boolean | null;
  category?: {
    name?: string | null;
    abbreviation?: string | null;
    sport?: { name?: string | null } | null;
  } | null;
  tournament?: { name?: string | null; status?: string | null } | null;
  teamA?: Registration | null;
  teamB?: Registration | null;
};

type LiveState = {
  isLive?: boolean;
  activeSet?: number;
  setDurationSeconds?: number;
  setTimerSeconds?: number;
  setTimerRunning?: boolean;
  substitutions?: { A?: number; B?: number };
  minuteTimers?: { A?: number; B?: number };
  minuteRunning?: { A?: boolean; B?: boolean };
  minuteCountsBySet?: Record<string, { A?: number; B?: number }>;
  bonusByPlayer?: Record<string, { double: number; triple: number }>;
  lastUpdate?: string;
};

type ScoreSet = { a: number; b: number };

const DEFAULT_SET_MINUTES = 15;

const emptySet = (): ScoreSet => ({ a: 0, b: 0 });

const buildTeamLabel = (team?: Registration | null) => {
  if (!team) return "Por definir";
  if (team.teamName) return team.teamName;
  const players = [team.player, team.partner, team.partnerTwo].filter(
    Boolean
  ) as Player[];
  return players
    .map((player) => `${player.firstName} ${player.lastName}`.trim())
    .join(" / ");
};

const buildTeamMembers = (team?: Registration | null) => {
  if (!team) return "N/D";
  const players = [team.player, team.partner, team.partnerTwo].filter(
    Boolean
  ) as Player[];
  return players
    .map((player) => `${player.firstName} ${player.lastName}`.trim())
    .join(" / ");
};

const formatDateShort = (value?: string | null) => {
  if (!value) return "N/D";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-BO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatClock = (value: number) => {
  const total = Math.max(0, Math.floor(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export default function RefereeMatchPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sets, setSets] = useState<ScoreSet[]>([emptySet()]);
  const [activeSet, setActiveSet] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [setDurationMinutes, setSetDurationMinutes] = useState(
    DEFAULT_SET_MINUTES
  );
  const [setTimerSeconds, setSetTimerSeconds] = useState(
    DEFAULT_SET_MINUTES * 60
  );
  const [setTimerRunning, setSetTimerRunning] = useState(false);
  const [substitutions, setSubstitutions] = useState({ A: 0, B: 0 });
  const [minuteTimers, setMinuteTimers] = useState({ A: 60, B: 60 });
  const [minuteRunning, setMinuteRunning] = useState({ A: false, B: false });
  const [minuteCountsBySet, setMinuteCountsBySet] = useState<
    Record<string, { A: number; B: number }>
  >({});
  const [autoSaveTick, setAutoSaveTick] = useState(0);
  const [bonusByPlayer, setBonusByPlayer] = useState<
    Record<string, { double: number; triple: number }>
  >({});
  const [pendingBonus, setPendingBonus] = useState<{
    side: "A" | "B";
    kind: "double" | "triple";
    points: number;
  } | null>(null);
  const [lastBonusAction, setLastBonusAction] = useState<{
    playerId: string;
    kind: "double" | "triple";
    side: "A" | "B";
    setIndex: number;
    points: number;
  } | null>(null);

  const isFronton = useMemo(() => {
    const sportName = match?.category?.sport?.name ?? "";
    return sportName.toLowerCase().includes("fronton");
  }, [match?.category?.sport?.name]);

  const teamPlayersA = useMemo(() => {
    const team = match?.teamA;
    if (!team) return [] as Player[];
    return [team.player, team.partner, team.partnerTwo].filter(Boolean) as Player[];
  }, [match?.teamA]);

  const teamPlayersB = useMemo(() => {
    const team = match?.teamB;
    if (!team) return [] as Player[];
    return [team.player, team.partner, team.partnerTwo].filter(Boolean) as Player[];
  }, [match?.teamB]);

  const loadMatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/referee/${token}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo cargar el partido");
      }
      const nextMatch = data.match as MatchData;
      setMatch(nextMatch);
      const parsedSets = Array.isArray(nextMatch.games)
        ? nextMatch.games.map((game) => ({
            a: typeof game.a === "number" ? game.a : 0,
            b: typeof game.b === "number" ? game.b : 0,
          }))
        : [emptySet()];
      setSets(parsedSets.length ? parsedSets : [emptySet()]);
      const state = nextMatch.liveState ?? {};
      setIsLive(Boolean(state.isLive));
      setActiveSet(state.activeSet ?? 0);
      const setSeconds =
        state.setDurationSeconds ?? DEFAULT_SET_MINUTES * 60;
      setSetDurationMinutes(Math.max(1, Math.round(setSeconds / 60)));
      setSetTimerSeconds(state.setTimerSeconds ?? setSeconds);
      setSetTimerRunning(Boolean(state.setTimerRunning));
      setSubstitutions({
        A: state.substitutions?.A ?? 0,
        B: state.substitutions?.B ?? 0,
      });
      setMinuteTimers({
        A: state.minuteTimers?.A ?? 60,
        B: state.minuteTimers?.B ?? 60,
      });
      setMinuteRunning({
        A: Boolean(state.minuteRunning?.A),
        B: Boolean(state.minuteRunning?.B),
      });
      setMinuteCountsBySet(() => {
        const saved = state.minuteCountsBySet ?? {};
        const next: Record<string, { A: number; B: number }> = {};
        Object.entries(saved).forEach(([key, value]) => {
          next[key] = {
            A: Number((value as { A?: number }).A ?? 0),
            B: Number((value as { B?: number }).B ?? 0),
          };
        });
        return next;
      });
      setBonusByPlayer(state.bonusByPlayer ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadMatch();
  }, [loadMatch]);

  useEffect(() => {
    if (!setTimerRunning || isFronton) return;
    const timer = window.setInterval(() => {
      setSetTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [setTimerRunning, isFronton]);

  useEffect(() => {
    if (!minuteRunning.A || isFronton) return;
    const timer = window.setInterval(() => {
      setMinuteTimers((prev) => {
        if (prev.A > 1) return { ...prev, A: prev.A - 1 };
        setMinuteRunning((running) => ({ ...running, A: false }));
        setMinuteCountsBySet((counts) => {
          const key = String(activeSet);
          const current = counts[key] ?? { A: 0, B: 0 };
          return {
            ...counts,
            [key]: { ...current, A: current.A + 1 },
          };
        });
        setAutoSaveTick((tick) => tick + 1);
        return { ...prev, A: 0 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [minuteRunning.A, activeSet, isFronton]);

  useEffect(() => {
    if (!minuteRunning.B || isFronton) return;
    const timer = window.setInterval(() => {
      setMinuteTimers((prev) => {
        if (prev.B > 1) return { ...prev, B: prev.B - 1 };
        setMinuteRunning((running) => ({ ...running, B: false }));
        setMinuteCountsBySet((counts) => {
          const key = String(activeSet);
          const current = counts[key] ?? { A: 0, B: 0 };
          return {
            ...counts,
            [key]: { ...current, B: current.B + 1 },
          };
        });
        setAutoSaveTick((tick) => tick + 1);
        return { ...prev, B: 0 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [minuteRunning.B, activeSet, isFronton]);

  useEffect(() => {
    setMinuteTimers({ A: 60, B: 60 });
    setMinuteRunning({ A: false, B: false });
    setAutoSaveTick((prev) => prev + 1);
  }, [activeSet]);

  const buildLiveState = (override?: Partial<LiveState>) => ({
    isLive,
    activeSet,
    setDurationSeconds: Math.max(60, setDurationMinutes * 60),
    setTimerSeconds,
    setTimerRunning,
    substitutions,
    minuteTimers,
    minuteRunning,
    minuteCountsBySet,
    bonusByPlayer,
    lastUpdate: new Date().toISOString(),
    ...override,
  });

  const persistMatch = useCallback(
    async (options?: { finished?: boolean; liveState?: LiveState }) => {
      if (!match) return;
      setSaving(true);
      setMessage(null);
      setError(null);
      try {
        const response = await fetch(`/api/referee/${token}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            games: sets.map((set) => ({ a: set.a, b: set.b })),
            liveState: options?.liveState ?? buildLiveState(),
            finished: options?.finished ?? false,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error ?? "No se pudo guardar el marcador");
        }
        const updated = data.match as MatchData;
        setMatch((prev) =>
          prev
            ? {
                ...prev,
                games: updated.games ?? prev.games,
                liveState: updated.liveState ?? prev.liveState,
                winnerSide: updated.winnerSide ?? prev.winnerSide,
                outcomeType: updated.outcomeType ?? prev.outcomeType,
                outcomeSide: updated.outcomeSide ?? prev.outcomeSide,
              }
            : prev
        );
        setMessage(
          options?.finished ? "Partido finalizado" : "Marcador actualizado"
        );
        if (options?.finished) {
          setIsLive(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error inesperado");
      } finally {
        setSaving(false);
      }
    },
    [match, token, sets, buildLiveState]
  );

  useEffect(() => {
    if (!autoSaveTick) return;
    const timer = window.setTimeout(() => {
      void persistMatch();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [autoSaveTick, persistMatch]);

  const updateSetScore = (side: "A" | "B", delta: number) => {
    setSets((prev) => {
      const next = [...prev];
      const target = next[activeSet] ?? emptySet();
      const value = Math.max(0, (side === "A" ? target.a : target.b) + delta);
      next[activeSet] = {
        a: side === "A" ? value : target.a,
        b: side === "B" ? value : target.b,
      };
      return next;
    });
    setAutoSaveTick((prev) => prev + 1);
  };

  const updateSetScoreAt = (
    side: "A" | "B",
    delta: number,
    index: number
  ) => {
    setSets((prev) => {
      const next = [...prev];
      const target = next[index] ?? emptySet();
      const value = Math.max(0, (side === "A" ? target.a : target.b) + delta);
      next[index] = {
        a: side === "A" ? value : target.a,
        b: side === "B" ? value : target.b,
      };
      return next;
    });
    setAutoSaveTick((prev) => prev + 1);
  };

  const addSet = () => {
    setSets((prev) => [...prev, emptySet()]);
    setActiveSet(sets.length);
    setAutoSaveTick((prev) => prev + 1);
  };

  const removeSet = () => {
    setSets((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    setActiveSet((prev) => Math.max(0, prev - 1));
    setAutoSaveTick((prev) => prev + 1);
  };

  const resetSetTimer = () => {
    setSetTimerSeconds(Math.max(60, setSetDurationMinutes * 60));
    setSetTimerRunning(false);
    if (isFronton) return;
    void persistMatch({
      liveState: buildLiveState({
        setTimerSeconds: Math.max(60, setSetDurationMinutes * 60),
        setTimerRunning: false,
      }),
    });
  };

  const startMinuteTimer = (side: "A" | "B") => {
    if (isFronton) return;
    const nextTimers = { ...minuteTimers, [side]: 60 };
    const nextRunning = { ...minuteRunning, [side]: true };
    setMinuteTimers(nextTimers);
    setMinuteRunning(nextRunning);
    void persistMatch({
      liveState: buildLiveState({
        minuteTimers: nextTimers,
        minuteRunning: nextRunning,
      }),
    });
  };

  const toggleMinuteTimer = (side: "A" | "B") => {
    if (isFronton) return;
    const next = !minuteRunning[side];
    const nextRunning = { ...minuteRunning, [side]: next };
    setMinuteRunning(nextRunning);
    void persistMatch({
      liveState: buildLiveState({
        minuteRunning: nextRunning,
      }),
    });
  };

  const resetMinuteTimer = (side: "A" | "B") => {
    if (isFronton) return;
    const nextTimers = { ...minuteTimers, [side]: 60 };
    const nextRunning = { ...minuteRunning, [side]: false };
    setMinuteTimers(nextTimers);
    setMinuteRunning(nextRunning);
    void persistMatch({
      liveState: buildLiveState({
        minuteTimers: nextTimers,
        minuteRunning: nextRunning,
      }),
    });
  };

  const updateCount = (
    side: "A" | "B",
    setter: Dispatch<SetStateAction<{ A: number; B: number }>>,
    delta: number
  ) => {
    if (isFronton) return;
    setter((prev) => {
      const value = Math.max(0, (prev[side] ?? 0) + delta);
      return { ...prev, [side]: value };
    });
    setAutoSaveTick((prev) => prev + 1);
  };

  const bumpBonus = (
    playerId: string,
    kind: "double" | "triple",
    delta: number
  ) => {
    if (!playerId) return;
    setBonusByPlayer((prev) => {
      const current = prev[playerId] ?? { double: 0, triple: 0 };
      const value = Math.max(0, current[kind] + delta);
      return {
        ...prev,
        [playerId]: { ...current, [kind]: value },
      };
    });
    setAutoSaveTick((prev) => prev + 1);
  };

  const recordBonusAction = (
    playerId: string,
    kind: "double" | "triple",
    side: "A" | "B",
    setIndex: number,
    points: number
  ) => {
    if (!playerId) return;
    setLastBonusAction({ playerId, kind, side, setIndex, points });
  };

  const undoLastBonus = () => {
    if (!lastBonusAction) return;
    bumpBonus(lastBonusAction.playerId, lastBonusAction.kind, -1);
    updateSetScoreAt(
      lastBonusAction.side,
      -lastBonusAction.points,
      lastBonusAction.setIndex
    );
    setLastBonusAction(null);
  };

  const teamALabel = buildTeamLabel(match?.teamA);
  const teamBLabel = buildTeamLabel(match?.teamB);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Panel del arbitro
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">
                {match?.tournament?.name ?? "Partido en vivo"}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {match?.category?.name ?? "Categoria"} ·{" "}
                {match?.category?.abbreviation ?? "N/D"} ·{" "}
                {formatDateShort(match?.scheduledDate)}{" "}
                {match?.startTime ?? ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  isLive
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {isLive ? "En vivo" : "En espera"}
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !isLive;
                  setIsLive(next);
                  void persistMatch({
                    liveState: buildLiveState({ isLive: next }),
                  });
                }}
                className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
              >
                {isLive ? "Pausar" : "Iniciar"}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-slate-400">Cargando partido...</p>
          ) : error ? (
            <p className="mt-6 text-sm text-rose-300">{error}</p>
          ) : (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
                      Marcador
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">
                      {teamALabel} vs {teamBLabel}
                    </h2>
                    <p className="mt-2 text-xs text-slate-400">
                      {buildTeamMembers(match?.teamA)} ·{" "}
                      {buildTeamMembers(match?.teamB)}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {saving ? "Guardando..." : "Guardado automatico"}
                  </span>
                </div>

                {!isLive ? (
                  <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-6 text-center text-sm text-slate-300">
                    Inicia el partido para habilitar el marcador.
                  </div>
                ) : (
                  <>
                    <div className="mt-6 flex flex-wrap gap-2">
                  {sets.map((set, index) => (
                    <button
                      key={`set-${index}`}
                      type="button"
                      onClick={() => setActiveSet(index)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] transition ${
                        activeSet === index
                          ? "bg-white text-slate-900"
                          : "border border-white/10 bg-white/5 text-white"
                      }`}
                    >
                      Set {index + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={addSet}
                    className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:text-white"
                  >
                    + Set
                  </button>
                  <button
                    type="button"
                    onClick={removeSet}
                    className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:text-white"
                  >
                    - Set
                  </button>
                </div>

                <div className="mt-6 grid gap-4 rounded-3xl border border-white/10 bg-slate-950/70 p-4 md:grid-cols-2">
                  {(["A", "B"] as const).map((side) => {
                    const label = side === "A" ? teamALabel : teamBLabel;
                    const score = sets[activeSet] ?? emptySet();
                    const value = side === "A" ? score.a : score.b;
                    return (
                      <div
                        key={side}
                        className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                      >
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                          {label}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-4xl font-semibold text-white">
                            {value}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateSetScore(side, -1)}
                              className="h-10 rounded-full border border-white/10 bg-white/10 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                            >
                              -1
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSetScore(side, 1)}
                              className="h-10 rounded-full border border-emerald-400/30 bg-emerald-400/20 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100"
                            >
                              +1
                            </button>
                            {isFronton && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPendingBonus({
                                      side,
                                      kind: "double",
                                      points: 2,
                                    });
                                  }}
                                  className="h-10 rounded-full border border-sky-400/30 bg-sky-400/20 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-100"
                                >
                                  Doble
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPendingBonus({
                                      side,
                                      kind: "triple",
                                      points: 3,
                                    });
                                  }}
                                  className="h-10 rounded-full border border-indigo-400/30 bg-indigo-400/20 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100"
                                >
                                  Triple
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {isFronton && pendingBonus?.side === side && (
                          <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-xs text-slate-300">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                              Asignar {pendingBonus.kind === "double" ? "doble" : "triple"}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {(side === "A" ? teamPlayersA : teamPlayersB).map(
                                (player) => (
                                  <button
                                    key={player.id}
                                    type="button"
                                    onClick={() => {
                                      updateSetScore(side, pendingBonus.points);
                                      bumpBonus(
                                        player.id,
                                        pendingBonus.kind,
                                        1
                                      );
                                      recordBonusAction(
                                        player.id,
                                        pendingBonus.kind,
                                        side,
                                        activeSet,
                                        pendingBonus.points
                                      );
                                      setPendingBonus(null);
                                    }}
                                    className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20"
                                  >
                                    {player.firstName} {player.lastName}
                                  </button>
                                )
                              )}
                              <button
                                type="button"
                                onClick={() => setPendingBonus(null)}
                                className="rounded-full border border-white/10 bg-transparent px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {isFronton && (
                  <div className="mt-6 rounded-3xl border border-white/10 bg-slate-900/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                        Dobles y triples
                      </p>
                      <button
                        type="button"
                        onClick={undoLastBonus}
                        disabled={!lastBonusAction}
                        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Deshacer ultimo
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
                      {[...teamPlayersA, ...teamPlayersB].map((player) => {
                        const stats = bonusByPlayer[player.id] ?? {
                          double: 0,
                          triple: 0,
                        };
                        return (
                          <div
                            key={`bonus-${player.id}`}
                            className="rounded-2xl border border-white/10 bg-slate-950/70 p-3"
                          >
                            <p className="font-semibold text-white">
                              {player.firstName} {player.lastName}
                            </p>
                            <p className="mt-1 text-slate-400">
                              Dobles:{" "}
                              <span className="text-slate-100">
                                {stats.double}
                              </span>{" "}
                              · Triples:{" "}
                              <span className="text-slate-100">
                                {stats.triple}
                              </span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-slate-400">
                    {message ?? " "}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const confirmed = window.confirm(
                        "Deseas finalizar el partido? Esta accion no se puede deshacer."
                      );
                      if (!confirmed) return;
                      void persistMatch({
                        finished: true,
                        liveState: buildLiveState({ isLive: false }),
                      }).then(() => {
                        setMessage("Gracias por arbitrar");
                      });
                    }}
                    className="rounded-full border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100 transition hover:bg-rose-500/30"
                  >
                    Finalizar partido
                  </button>
                </div>
                  </>
                )}
              </section>

              {!isFronton && (
                <section className="space-y-6">
                  <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
                      Minuto
                    </h3>
                    <div className="mt-4 space-y-4">
                      {(["A", "B"] as const).map((side) => (
                        <div
                          key={`control-${side}`}
                          className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                        >
                          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                            {side === "A" ? teamALabel : teamBLabel}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs text-slate-400">Minuto</p>
                              <p className="text-lg font-semibold text-white">
                                {formatClock(minuteTimers[side])}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                Minutos en set {activeSet + 1}:{" "}
                                {(minuteCountsBySet[String(activeSet)] ?? {
                                  A: 0,
                                  B: 0,
                                })[side]}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => startMinuteTimer(side)}
                                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                              >
                                Iniciar 1 min
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleMinuteTimer(side)}
                                className="rounded-full border border-white/10 bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70"
                              >
                                {minuteRunning[side] ? "Pausar" : "Continuar"}
                              </button>
                              <button
                                type="button"
                                onClick={() => resetMinuteTimer(side)}
                                className="rounded-full border border-white/10 bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70"
                              >
                                Reset
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
