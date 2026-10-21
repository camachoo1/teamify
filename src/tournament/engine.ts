import {
  BracketFormat,
  MatchResult,
  MatchSpec,
  ResolvedMatch,
  SeriesKey,
  Source,
  StandingRow,
  Tournament,
  TournamentGroup,
  TournamentSettings,
  TournamentTeam,
} from './types';

export const SERIES_LENGTHS = [1, 3, 5, 7, 9];

export const DEFAULT_SETTINGS: TournamentSettings = {
  format: 'single',
  bracketFormat: 'double',
  bestOf: 3,
  bestOfOverrides: {},
  bracketReset: false,
  splitStart: false,
  groupSize: 4,
  advancePerGroup: 2,
};

/** Map wins needed to take a best-of-N series. */
export const winsNeeded = (bestOf: number): number =>
  Math.floor(bestOf / 2) + 1;

export const seriesLength = (
  settings: TournamentSettings,
  key?: SeriesKey
): number => {
  if (key === 'reset') {
    return (
      settings.bestOfOverrides.reset ??
      settings.bestOfOverrides.grandFinal ??
      settings.bestOf
    );
  }
  return (key && settings.bestOfOverrides[key]) || settings.bestOf;
};

const nextPow2 = (n: number): number => {
  let size = 1;
  while (size < n) size *= 2;
  return size;
};

/**
 * Standard bracket seed positions, e.g. size 8 gives 1,8,4,5,2,7,3,6:
 * consecutive pairs are first-round matches, top seeds meet last, and
 * byes (seeds past the team count) are spread out.
 */
const seedOrder = (size: number): number[] => {
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((seed) => [seed, n + 1 - seed]);
  }
  return order;
};

const seededSlots = (teamIds: number[], size: number): Source[] =>
  seedOrder(size).map((seed) =>
    seed <= teamIds.length
      ? { kind: 'team', teamId: teamIds[seed - 1] }
      : { kind: 'bye' }
  );

const winnerOf = (matchId: string): Source => ({ kind: 'winner', matchId });
const loserOf = (matchId: string): Source => ({ kind: 'loser', matchId });

/**
 * Builds the bracket matches. Matches are returned in dependency order:
 * every match comes after the matches that feed it.
 *
 * @param upperSeeds - Teams starting in the upper (or only) bracket, best seed first
 * @param lowerSeeds - Double elimination split start: teams starting in the lower bracket
 */
export const buildBracket = (
  settings: TournamentSettings,
  format: BracketFormat,
  upperSeeds: number[],
  lowerSeeds: number[] = []
): MatchSpec[] => {
  const matches: MatchSpec[] = [];
  const stage = format === 'single' ? 'single' : 'upper';
  const prefix = format === 'single' ? 'r' : 'u';

  // Upper (or single) elimination bracket
  const size = nextPow2(Math.max(2, upperSeeds.length));
  const roundCount = Math.log2(size);
  let slots = seededSlots(upperSeeds, size);
  const upperRounds: string[][] = [];

  for (let round = 1; round <= roundCount; round++) {
    const ids: string[] = [];
    const roundsLeft = roundCount - round;
    const key: SeriesKey | undefined =
      format === 'single'
        ? roundsLeft === 0
          ? 'final'
          : roundsLeft === 1
          ? 'semifinal'
          : undefined
        : roundsLeft === 0
        ? 'upperFinal'
        : undefined;

    for (let i = 0; i < slots.length / 2; i++) {
      const id = `${prefix}${round}-${i + 1}`;
      ids.push(id);
      matches.push({
        id,
        stage,
        round,
        order: i + 1,
        sources: [slots[2 * i], slots[2 * i + 1]],
        bestOf: seriesLength(settings, key),
      });
    }
    upperRounds.push(ids);
    slots = ids.map(winnerOf);
  }

  if (format === 'single') return matches;

  // Lower bracket
  let lowerRound = 0;
  const addLowerRound = (pairs: [Source, Source][]): Source[] => {
    lowerRound++;
    return pairs.map((sources, i) => {
      const id = `l${lowerRound}-${i + 1}`;
      matches.push({
        id,
        stage: 'lower',
        round: lowerRound,
        order: i + 1,
        sources,
        bestOf: settings.bestOf, // the lower final is set below
      });
      return winnerOf(id);
    });
  };
  const pairUp = (list: Source[]): [Source, Source][] =>
    Array.from({ length: list.length / 2 }, (_, i) => [
      list[2 * i],
      list[2 * i + 1],
    ]);

  let survivors: Source[];
  let firstDropRound: number;

  if (lowerSeeds.length > 0) {
    // Split start: lower-bracket starters play down to one team per
    // upper first-round loser, then meet those losers
    const target = upperRounds[0].length;
    const qualifierSize = nextPow2(Math.max(target, lowerSeeds.length));
    survivors = seededSlots(lowerSeeds, qualifierSize);
    while (survivors.length > target) {
      survivors = addLowerRound(pairUp(survivors));
    }
    firstDropRound = 1;
  } else {
    // Upper first-round losers play each other
    survivors = upperRounds[0].map(loserOf);
    if (survivors.length > 1) survivors = addLowerRound(pairUp(survivors));
    firstDropRound = 2;
  }

  for (let round = firstDropRound; round <= roundCount; round++) {
    // Alternate the drop-in order so teams don't immediately replay
    // someone they just met in the upper bracket
    const droppers = upperRounds[round - 1].map(loserOf);
    if (round % 2 === 0) droppers.reverse();
    survivors = addLowerRound(
      survivors.map((s, i) => [s, droppers[i]] as [Source, Source])
    );
    if (round < roundCount && survivors.length > 1) {
      survivors = addLowerRound(pairUp(survivors));
    }
  }

  const lowerFinal = matches[matches.length - 1];
  lowerFinal.bestOf = seriesLength(settings, 'lowerFinal');

  const upperFinalId = upperRounds[roundCount - 1][0];
  const grandSources: [Source, Source] = [
    winnerOf(upperFinalId),
    winnerOf(lowerFinal.id),
  ];
  matches.push({
    id: 'gf',
    stage: 'grand',
    round: 1,
    order: 1,
    sources: grandSources,
    bestOf: seriesLength(settings, 'grandFinal'),
  });
  if (settings.bracketReset) {
    matches.push({
      id: 'gf-reset',
      stage: 'reset',
      round: 1,
      order: 1,
      sources: grandSources,
      bestOf: seriesLength(settings, 'reset'),
    });
  }

  return matches;
};

/**
 * Splits teams into groups (sizes differ by at most one) and schedules a
 * single round robin in each.
 */
export const buildGroups = (
  settings: TournamentSettings,
  teamIds: number[]
): { groups: TournamentGroup[]; matches: MatchSpec[] } => {
  const groupCount = Math.max(
    1,
    Math.ceil(teamIds.length / settings.groupSize)
  );
  const groups: TournamentGroup[] = Array.from(
    { length: groupCount },
    (_, i) => ({
      id: String.fromCharCode(65 + i),
      name: `Group ${String.fromCharCode(65 + i)}`,
      teamIds: [],
    })
  );
  teamIds.forEach((teamId, i) => groups[i % groupCount].teamIds.push(teamId));

  const matches: MatchSpec[] = [];
  groups.forEach((group) => {
    // Circle method: fix the first team, rotate the rest
    const rotation: (number | null)[] = [...group.teamIds];
    if (rotation.length % 2 === 1) rotation.push(null);
    const n = rotation.length;
    for (let round = 1; round < n; round++) {
      let order = 0;
      for (let i = 0; i < n / 2; i++) {
        const a = rotation[i];
        const b = rotation[n - 1 - i];
        if (a === null || b === null) continue;
        order++;
        matches.push({
          id: `g${group.id}-${round}-${order}`,
          stage: 'group',
          round,
          order,
          groupId: group.id,
          sources: [
            { kind: 'team', teamId: a },
            { kind: 'team', teamId: b },
          ],
          bestOf: seriesLength(settings, 'groups'),
        });
      }
      rotation.splice(1, 0, rotation.pop()!);
    }
  });

  return { groups, matches };
};

/**
 * Creates a tournament.
 *
 * @param seeding - Team ids in seed (or draw) order
 * @param lowerTeamIds - Split start: teams that begin in the lower bracket
 */
export const createTournament = (
  settings: TournamentSettings,
  teams: TournamentTeam[],
  seeding: number[],
  lowerTeamIds: number[] = []
): Tournament => {
  const base = {
    id: Date.now(),
    createdAt: new Date().toISOString(),
    settings,
    teams,
    results: {},
    tieOrder: {},
  };

  if (settings.format === 'groups') {
    const { groups, matches } = buildGroups(settings, seeding);
    return { ...base, groups, matches, phase: 'groups' };
  }

  const useSplit =
    settings.format === 'double' &&
    settings.splitStart &&
    lowerTeamIds.length > 0;
  const lower = useSplit
    ? seeding.filter((id) => lowerTeamIds.includes(id))
    : [];
  const upper = seeding.filter((id) => !lower.includes(id));

  return {
    ...base,
    groups: [],
    matches: buildBracket(settings, settings.format, upper, lower),
    phase: 'bracket',
  };
};

/** Works out who plays in every match and who has won, from the results. */
export const resolveMatches = (tournament: Tournament): ResolvedMatch[] => {
  const resolved = new Map<string, ResolvedMatch>();

  // A slot is a team id, 'dead' (no team will ever come), or 'pending'
  const slot = (source: Source): number | 'dead' | 'pending' => {
    switch (source.kind) {
      case 'team':
        return source.teamId;
      case 'bye':
        return 'dead';
      case 'winner':
      case 'loser': {
        const from = resolved.get(source.matchId);
        if (!from || from.status === 'pending' || from.status === 'ready') {
          return 'pending';
        }
        if (from.status === 'void') return 'dead';
        const team = source.kind === 'winner' ? from.winner : from.loser;
        return team ?? 'dead';
      }
    }
  };

  for (const match of tournament.matches) {
    const a = slot(match.sources[0]);
    const b = slot(match.sources[1]);
    const out: ResolvedMatch = {
      ...match,
      teamA: typeof a === 'number' ? a : null,
      teamB: typeof b === 'number' ? b : null,
      status: 'pending',
      winner: null,
      loser: null,
      scoreA: null,
      scoreB: null,
    };

    const grand = resolved.get('gf');
    const resetState =
      match.stage !== 'reset' || !grand
        ? null
        : grand.status === 'pending' || grand.status === 'ready'
        ? 'pending' // waits on the first grand final
        : grand.status !== 'done' || grand.winner === grand.teamA
        ? 'void' // the upper-bracket team won: no reset needed
        : null;

    if (resetState) {
      out.status = resetState;
    } else if (a === 'pending' || b === 'pending') {
      out.status = 'pending';
    } else if (a === 'dead' && b === 'dead') {
      out.status = 'void';
    } else if (a === 'dead' || b === 'dead') {
      out.status = 'walkover';
      out.winner = a === 'dead' ? (b as number) : (a as number);
    } else {
      out.status = 'ready';
      const result = tournament.results[match.id];
      const need = winsNeeded(match.bestOf);
      if (
        result &&
        result.teamA === a &&
        result.teamB === b &&
        Math.max(result.scoreA, result.scoreB) === need
      ) {
        out.status = 'done';
        out.scoreA = result.scoreA;
        out.scoreB = result.scoreB;
        out.winner = result.scoreA > result.scoreB ? a : b;
        out.loser = out.winner === a ? b : a;
      }
    }

    resolved.set(match.id, out);
  }

  return tournament.matches.map((m) => resolved.get(m.id)!);
};

/** The tournament winner, once decided. */
export const getChampion = (
  tournament: Tournament,
  resolved: ResolvedMatch[] = resolveMatches(tournament)
): number | null => {
  if (tournament.phase !== 'bracket') return null;
  const byId = new Map(resolved.map((m) => [m.id, m]));
  const reset = byId.get('gf-reset');
  if (reset && reset.status === 'done') return reset.winner;
  const grand = byId.get('gf');
  if (grand) {
    if (grand.status !== 'done' && grand.status !== 'walkover') return null;
    if (reset && reset.status !== 'void') return null;
    return grand.winner;
  }
  const finals = resolved.filter((m) => m.stage === 'single');
  const final = finals[finals.length - 1];
  return final && (final.status === 'done' || final.status === 'walkover')
    ? final.winner
    : null;
};

// Drop results whose match no longer has the teams they were entered for
const pruneStaleResults = (tournament: Tournament): Tournament => {
  let current = tournament;
  for (;;) {
    const resolved = resolveMatches(current);
    const stale = resolved.filter((m) => {
      const result = current.results[m.id];
      return (
        result && (result.teamA !== m.teamA || result.teamB !== m.teamB)
      );
    });
    if (stale.length === 0) return current;
    const results = { ...current.results };
    stale.forEach((m) => delete results[m.id]);
    current = { ...current, results };
  }
};

/**
 * Records a series score. One side must have exactly the wins needed.
 * Later results that no longer apply (because a different team now
 * advances) are removed.
 */
export const recordResult = (
  tournament: Tournament,
  matchId: string,
  scoreA: number,
  scoreB: number
): Tournament => {
  const match = resolveMatches(tournament).find((m) => m.id === matchId);
  if (!match || match.teamA === null || match.teamB === null) {
    return tournament;
  }
  const need = winsNeeded(match.bestOf);
  const valid =
    Math.max(scoreA, scoreB) === need &&
    Math.min(scoreA, scoreB) < need &&
    Math.min(scoreA, scoreB) >= 0;
  if (!valid) return tournament;

  const result: MatchResult = {
    teamA: match.teamA,
    teamB: match.teamB,
    scoreA,
    scoreB,
  };
  return pruneStaleResults({
    ...tournament,
    results: { ...tournament.results, [matchId]: result },
  });
};

export const clearResult = (
  tournament: Tournament,
  matchId: string
): Tournament => {
  const results = { ...tournament.results };
  delete results[matchId];
  return pruneStaleResults({ ...tournament, results });
};

/**
 * Group table, ranked by series wins, then head-to-head among tied teams,
 * then map difference, then the organizer's chosen order.
 */
export const groupStandings = (
  tournament: Tournament,
  groupId: string,
  resolved: ResolvedMatch[] = resolveMatches(tournament)
): StandingRow[] => {
  const group = tournament.groups.find((g) => g.id === groupId);
  if (!group) return [];

  const played = resolved.filter(
    (m) => m.groupId === groupId && m.status === 'done'
  );
  const rows = new Map<number, StandingRow>(
    group.teamIds.map((teamId) => [
      teamId,
      {
        teamId,
        played: 0,
        wins: 0,
        losses: 0,
        mapsWon: 0,
        mapsLost: 0,
        rank: 0,
        tiedOnTiebreakers: false,
        unresolvedTie: false,
      },
    ])
  );
  played.forEach((m) => {
    const a = rows.get(m.teamA!)!;
    const b = rows.get(m.teamB!)!;
    a.played++;
    b.played++;
    a.mapsWon += m.scoreA!;
    a.mapsLost += m.scoreB!;
    b.mapsWon += m.scoreB!;
    b.mapsLost += m.scoreA!;
    if (m.winner === m.teamA) {
      a.wins++;
      b.losses++;
    } else {
      b.wins++;
      a.losses++;
    }
  });

  const manual = tournament.tieOrder[groupId] ?? [];
  const manualRank = (teamId: number) => {
    const index = manual.indexOf(teamId);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  // Series wins against the other teams in a tied set
  const headToHead = (teamId: number, tied: Set<number>) =>
    played.filter(
      (m) =>
        m.winner === teamId &&
        tied.has(m.teamA!) &&
        tied.has(m.teamB!)
    ).length;

  const ordered: StandingRow[] = [];
  const byWins = [...rows.values()].sort((x, y) => y.wins - x.wins);
  for (let i = 0; i < byWins.length; ) {
    let j = i;
    while (j < byWins.length && byWins[j].wins === byWins[i].wins) j++;
    const cluster = byWins.slice(i, j);
    const tied = new Set(cluster.map((r) => r.teamId));
    const key = (r: StandingRow) => ({
      h2h: headToHead(r.teamId, tied),
      diff: r.mapsWon - r.mapsLost,
    });
    cluster.sort((x, y) => {
      const kx = key(x);
      const ky = key(y);
      return (
        ky.h2h - kx.h2h ||
        ky.diff - kx.diff ||
        manualRank(x.teamId) - manualRank(y.teamId)
      );
    });
    // Flag neighbors that only the organizer can separate
    for (let k = 1; k < cluster.length; k++) {
      const kx = key(cluster[k - 1]);
      const ky = key(cluster[k]);
      if (kx.h2h === ky.h2h && kx.diff === ky.diff) {
        cluster[k - 1].tiedOnTiebreakers = true;
        cluster[k].tiedOnTiebreakers = true;
        if (
          manualRank(cluster[k - 1].teamId) ===
          manualRank(cluster[k].teamId)
        ) {
          cluster[k - 1].unresolvedTie = true;
          cluster[k].unresolvedTie = true;
        }
      }
    }
    ordered.push(...cluster);
    i = j;
  }

  ordered.forEach((row, index) => (row.rank = index + 1));
  return ordered;
};

export const groupStageComplete = (
  tournament: Tournament,
  resolved: ResolvedMatch[] = resolveMatches(tournament)
): boolean =>
  resolved
    .filter((m) => m.stage === 'group')
    .every((m) => m.status === 'done');

/**
 * Teams advancing from the groups, in bracket seed order: all group
 * winners first (group A, B, ...), then all runners-up, and so on. Seeding
 * pairs the best seed with the last, so A1 meets the last group's
 * runner-up rather than a team from its own group.
 */
export const advancingTeams = (
  tournament: Tournament,
  resolved: ResolvedMatch[] = resolveMatches(tournament)
): { seeding: number[]; byPlace: number[][] } => {
  const tables = tournament.groups.map((g) =>
    groupStandings(tournament, g.id, resolved)
  );
  const byPlace: number[][] = [];
  for (let place = 0; place < tournament.settings.advancePerGroup; place++) {
    byPlace.push(
      tables
        .map((table) => table[place]?.teamId)
        .filter((id): id is number => id !== undefined)
    );
  }
  return { seeding: byPlace.flat(), byPlace };
};

/**
 * Ends the group stage and builds the bracket from the group results.
 * With a split start, group winners begin in the upper bracket and the
 * other advancing teams in the lower bracket.
 */
export const startBracketStage = (tournament: Tournament): Tournament => {
  const { settings } = tournament;
  const { seeding, byPlace } = advancingTeams(tournament);
  const split =
    settings.bracketFormat === 'double' &&
    settings.splitStart &&
    byPlace.length > 1;
  const upper = split ? byPlace[0] : seeding;
  const lower = split ? byPlace.slice(1).flat() : [];

  return {
    ...tournament,
    phase: 'bracket',
    matches: [
      ...tournament.matches,
      ...buildBracket(settings, settings.bracketFormat, upper, lower),
    ],
  };
};

/** Minimum teams needed to start a tournament with these settings. */
export const minimumTeams = (settings: TournamentSettings): number => {
  if (settings.format === 'groups') {
    return Math.max(3, settings.advancePerGroup + 1);
  }
  return settings.format === 'double' ? 3 : 2;
};
