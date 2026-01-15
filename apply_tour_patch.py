from pathlib import Path

path = Path("src/components/tournaments/tournament-playoffs.tsx")
data = path.read_text()
old = """          {mainMatches.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Todavia no hay llaves generadas para esta categoria.
            </p>
          ) : (
            <>
                {categoryMatches.filter((match) => match.isBronzeMatch).length > 0 && (
                  <div className="rounded-[32px] border border-amber-100 bg-amber-50/70 p-4 text-sm text-amber-900 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em]">
                      Bronze match
                    </p>
                    <p className="mt-2">
                      Cuando los perdedores de semifinales tienen partido por el tercer lugar.
                    </p>
                  </div>
                )}
                <div className="rounded-[32px] border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-white p-4 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)]">
                  <BracketCanvas
                    categoryId={category.id}
                    matches={categoryMatches.filter((match) => !match.isBronzeMatch)}
                    roundNumbers={roundNumbers}
                    roundLabelMap={labelMap}
                    bracketSize={bracketSize}
                    registrationMap={registrationMap}
                    labelByRegistration={labelByRegistration}
                    onSwapSides={handleSwapSides}
                    disableSwap={swapping}
                  />
                </div>
              </>
            )}

            {categoryMatches.some((match) => match.isBronzeMatch) && (
                <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                        Partido por el 3er lugar
                      </p>
                      <p className="text-sm text-slate-600">
                        Los semifinalistas perdedores se enfrentan aquA-.
                      </p>
                    </div>
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                      Bronze
                    </span>
                  </div>
                  <div className="mt-3 space-y-3 text-sm text-slate-700">
                    {categoryMatches
                      .filter((match) => match.isBronzeMatch)
                      .map((match) => {
                        const teamA = registrationMap.get(match.teamAId ?? "");
                        const teamB = registrationMap.get(match.teamBId ?? "");
                        return (
                          <div
                            key={match.id}
                            className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-sm"
                          >
                            <p className="font-semibold">
                              {formatTeamName(teamA)}{" "}
                              <span className="text-slate-400">vs</span>{" "}
                              {formatTeamName(teamB)}
                            </p>
                            {match.scheduledDate && (
                              <p className="text-xs text-slate-500">
                                {match.scheduledDate} {match.startTime ?? ""}
                                {" Aú "}
                                {match.clubId ? `Cancha ${match.courtNumber ?? "-"}` : "Sin cancha"}
                              </p>
                            )}
                            <button
                              type="button"
                              disabled
                              className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-500"
                            >
                              Asignar marcador
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
"""
new = """          {mainMatches.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Todavia no hay llaves generadas para esta categoria.
            </p>
          ) : (
            <>
              {bronzeMatches.length > 0 && (
                <div className="rounded-[32px] border border-amber-100 bg-amber-50/70 p-4 text-sm text-amber-900 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em]">
                    Bronze match
                  </p>
                  <p className="mt-2">
                    Cuando los perdedores de semifinales tienen partido por el tercer lugar.
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
                  labelByRegistration={labelByRegistration}
                  onSwapSides={handleSwapSides}
                  disableSwap={swapping}
                />
              </div>
            </>
          )}

          {bronzeMatches.length > 0 && (
            <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Partido por el 3er lugar
                  </p>
                  <p className="text-sm text-slate-600">
                    Los semifinalistas perdedores se enfrentan aquí.
                  </p>
                </div>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
                  Bronze
                </span>
              </div>
              <div className="mt-3 space-y-3 text-sm text-slate-700">
                {bronzeMatches.map((match) => {
                  const teamA = registrationMap.get(match.teamAId ?? "");
                  const teamB = registrationMap.get(match.teamBId ?? "");
                  return (
                    <div
                      key={match.id}
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-sm"
                    >
                      <p className="font-semibold">
                        {formatTeamName(teamA)}{" "}
                        <span className="text-slate-400">vs</span>{" "}
                        {formatTeamName(teamB)}
                      </p>
                      {match.scheduledDate && (
                        <p className="text-xs text-slate-500">
                          {match.scheduledDate} {match.startTime ?? ""}
                          {" · "}
                          {match.clubId ? f"Cancha {match.courtNumber or "-"}" : "Sin cancha"}
                        </p>
                      )}
                      <button
                        type="button"
                        disabled
                        className="mt-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-500"
                      >
                        Asignar marcador
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 rounded-[24px] border border-slate-100 bg-gradient-to-br from-white via-slate-50 to-white p-4 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)]">
                <BracketCanvas
                  categoryId={`${category.id}-bronze`}
                  matches={bronzeMatches}
                  roundNumbers={bronzeRoundNumbers}
                  roundLabelMap={bronzeLabelMap}
                  bracketSize={bronzeBracketSize}
                  registrationMap={registrationMap}
                  labelByRegistration={labelByRegistration}
                  onSwapSides={handleSwapSides}
                  disableSwap={swapping}
                />
              </div>
            </div>
          )}
"""
if old not in data:
    raise SystemExit("block not found")
path.write_text(data.replace(old, new, 1))
"""
