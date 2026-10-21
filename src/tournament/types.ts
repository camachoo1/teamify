export type TournamentFormat = 'single' | 'double' | 'groups';
export type BracketFormat = 'single' | 'double';

// Rounds whose series length can differ from the default
export type SeriesKey =
  | 'groups'
  | 'semifinal'
  | 'final'
  | 'upperFinal'
  | 'lowerFinal'
  | 'grandFinal'
  | 'reset';

export interface TournamentSettings {
  format: TournamentFormat;
  // Bracket played after the group stage (format 'groups' only)
  bracketFormat: BracketFormat;
  bestOf: number;
  bestOfOverrides: Partial<Record<SeriesKey, number>>;
  // Double elimination: replay the grand final if the lower-bracket team wins it
  bracketReset: boolean;
  // Double elimination: some teams begin in the lower bracket
  splitStart: boolean;
  groupSize: number;
  advancePerGroup: number;
}

export interface TournamentTeam {
  id: number;
  name: string;
  players: string[];
}

export interface TournamentGroup {
  id: string;
  name: string;
  teamIds: number[];
}

export type MatchStage =
  | 'group'
  | 'single'
  | 'upper'
  | 'lower'
  | 'grand'
  | 'reset';

// Where a match slot's team comes from
export type Source =
  | { kind: 'team'; teamId: number }
  | { kind: 'bye' }
  | { kind: 'winner'; matchId: string }
  | { kind: 'loser'; matchId: string };

export interface MatchSpec {
  id: string;
  stage: MatchStage;
  round: number; // 1-based, within its stage (or group)
  order: number; // 1-based position within the round
  groupId?: string;
  sources: [Source, Source];
  bestOf: number;
}

// The series score so far; the series is decided once a team reaches the
// wins needed. A result is tied to the two teams it was entered for, so it
// is dropped automatically if an earlier result changes who plays this match
export interface MatchResult {
  teamA: number;
  teamB: number;
  scoreA: number;
  scoreB: number;
}

export interface Tournament {
  id: number;
  createdAt: string;
  settings: TournamentSettings;
  teams: TournamentTeam[];
  groups: TournamentGroup[];
  matches: MatchSpec[];
  results: Record<string, MatchResult>;
  phase: 'groups' | 'bracket';
  // Organizer's order for teams still tied after every tiebreaker
  tieOrder: Record<string, number[]>;
}

export type MatchStatus =
  | 'pending' // waiting on an earlier match
  | 'ready' // both teams known, no maps played yet
  | 'live' // some maps played, no winner yet
  | 'done'
  | 'walkover' // one side is a bye; the other advances
  | 'void'; // not played (both sides empty, or an unneeded reset)

export interface ResolvedMatch extends MatchSpec {
  teamA: number | null;
  teamB: number | null;
  status: MatchStatus;
  winner: number | null;
  loser: number | null;
  scoreA: number | null;
  scoreB: number | null;
}

export interface StandingRow {
  teamId: number;
  played: number;
  wins: number;
  losses: number;
  mapsWon: number;
  mapsLost: number;
  rank: number;
  // Level with a neighbor after head-to-head and map difference, so only
  // the organizer's order separates them
  tiedOnTiebreakers: boolean;
  // Tied on tiebreakers and the organizer hasn't ordered them yet
  unresolvedTie: boolean;
}
