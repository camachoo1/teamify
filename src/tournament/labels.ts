import { MatchSpec, Source, Tournament } from './types';

/** Display name for a match's round, e.g. "Upper semifinals". */
export const roundLabel = (
  match: Pick<MatchSpec, 'stage' | 'round'>,
  roundCount: number
): string => {
  const fromEnd = roundCount - match.round;
  switch (match.stage) {
    case 'group':
      return `Round ${match.round}`;
    case 'single':
      return fromEnd === 0
        ? 'Final'
        : fromEnd === 1
        ? 'Semifinals'
        : fromEnd === 2
        ? 'Quarterfinals'
        : `Round ${match.round}`;
    case 'upper':
      return fromEnd === 0
        ? 'Upper final'
        : fromEnd === 1
        ? 'Upper semifinals'
        : `Upper round ${match.round}`;
    case 'lower':
      return fromEnd === 0 ? 'Lower final' : `Lower round ${match.round}`;
    case 'grand':
      return 'Grand final';
    case 'reset':
      return 'Grand final reset';
  }
};

const countRounds = (tournament: Tournament, stage: MatchSpec['stage']) =>
  Math.max(
    0,
    ...tournament.matches.filter((m) => m.stage === stage).map((m) => m.round)
  );

/** Full name of a match, e.g. "Upper round 1, match 2". */
export const matchLabel = (
  tournament: Tournament,
  match: MatchSpec
): string => {
  if (match.stage === 'group') {
    const group = tournament.groups.find((g) => g.id === match.groupId);
    return `${group?.name ?? 'Group'}, round ${match.round}`;
  }
  const rounds = countRounds(tournament, match.stage);
  const label = roundLabel(match, rounds);
  const inRound = tournament.matches.filter(
    (m) => m.stage === match.stage && m.round === match.round
  ).length;
  return inRound > 1 ? `${label}, match ${match.order}` : label;
};

/**
 * What to show in a slot whose team isn't known yet, e.g.
 * "Winner of Lower round 2, match 1" or, short, "Winner of Lower round 2 #1".
 */
export const sourceLabel = (
  tournament: Tournament,
  source: Source,
  short = false
): string => {
  if (source.kind === 'bye') return 'Bye';
  if (source.kind === 'team') {
    return (
      tournament.teams.find((t) => t.id === source.teamId)?.name ?? 'Team'
    );
  }
  const from = tournament.matches.find((m) => m.id === source.matchId);
  const name = !from
    ? 'an earlier match'
    : short
    ? matchLabel(tournament, from).replace(', match ', ' #')
    : matchLabel(tournament, from);
  return `${source.kind === 'winner' ? 'Winner' : 'Loser'} of ${name}`;
};
