import clsx from 'clsx';
import { ResolvedMatch, Tournament } from '../../tournament/types';
import { sourceLabel } from '../../tournament/labels';

interface MatchCardProps {
  tournament: Tournament;
  match: ResolvedMatch;
  onOpen: (match: ResolvedMatch) => void;
  // Shown above the teams, e.g. "Match 2"
  caption?: string;
}

export default function MatchCard({
  tournament,
  match,
  onOpen,
  caption,
}: MatchCardProps) {
  const teamName = (id: number | null, side: 0 | 1, short = false) =>
    id !== null
      ? tournament.teams.find((t) => t.id === id)?.name ?? 'Team'
      : sourceLabel(tournament, match.sources[side], short);

  const canEnter =
    match.status === 'ready' ||
    match.status === 'live' ||
    match.status === 'done';
  const rows = [
    { id: match.teamA, score: match.scoreA, side: 0 as const },
    { id: match.teamB, score: match.scoreB, side: 1 as const },
  ];

  const body = (
    <>
      <div className='mb-1.5 flex items-center justify-between gap-2 text-xs text-muted'>
        <span className='truncate'>{caption}</span>
        <span className='flex shrink-0 items-center gap-1.5 font-semibold'>
          {match.status === 'live' && (
            <span className='flex items-center gap-1 text-accent'>
              <span className='dot h-1.5 w-1.5 bg-accent' />
              In progress
            </span>
          )}
          {match.status === 'walkover'
            ? 'Bye'
            : match.status === 'void'
            ? 'Not needed'
            : `Bo${match.bestOf}`}
        </span>
      </div>
      <div className='divide-y divide-line overflow-hidden rounded-lg border border-line'>
        {rows.map(({ id, score, side }) => {
          const isWinner = match.winner !== null && match.winner === id;
          const isLoser =
            match.status === 'done' && match.winner !== id;
          return (
            <div
              key={side}
              className={clsx(
                'flex items-center gap-2 px-2.5 py-1.5 text-sm',
                isWinner ? 'bg-accent/15 font-semibold' : 'bg-surface',
                isLoser && 'text-muted'
              )}
            >
              <span
                className={clsx(
                  'h-4 w-1 shrink-0 rounded-full',
                  isWinner ? 'bg-accent' : 'bg-transparent'
                )}
              />
              <span
                className={clsx(
                  'min-w-0 flex-1 truncate',
                  id === null && 'text-xs italic text-muted'
                )}
                title={teamName(id, side)}
              >
                {teamName(id, side, true)}
              </span>
              <span className='w-5 text-right font-display text-lg font-bold tabular-nums leading-none'>
                {score ?? ''}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );

  if (!canEnter) {
    return (
      <div
        className={clsx(
          'w-60 rounded-xl p-2',
          match.status !== 'pending' && 'opacity-60'
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type='button'
      onClick={() => onOpen(match)}
      className={clsx(
        'w-60 rounded-xl p-2 text-left transition-colors hover:bg-sunk',
        (match.status === 'ready' || match.status === 'live') &&
          'ring-1 ring-accent/60'
      )}
      aria-label={`${
        match.status === 'ready'
          ? 'Enter score'
          : match.status === 'live'
          ? `Update score, ${match.scoreA} to ${match.scoreB}`
          : 'Edit result'
      }: ${teamName(match.teamA, 0)} against ${teamName(match.teamB, 1)}`}
    >
      {body}
    </button>
  );
}
