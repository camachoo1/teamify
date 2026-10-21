import { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { ResolvedMatch, Tournament } from '../../tournament/types';
import { recordResult, winsNeeded } from '../../tournament/engine';
import { matchLabel } from '../../tournament/labels';

interface ResultDialogProps {
  tournament: Tournament;
  match: ResolvedMatch;
  onSave: (scoreA: number, scoreB: number) => void;
  onClear: () => void;
  onClose: () => void;
}

export default function ResultDialog({
  tournament,
  match,
  onSave,
  onClear,
  onClose,
}: ResultDialogProps) {
  const need = winsNeeded(match.bestOf);
  const [scores, setScores] = useState<[number, number]>([
    match.scoreA ?? 0,
    match.scoreB ?? 0,
  ]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const name = (id: number | null) =>
    tournament.teams.find((t) => t.id === id)?.name ?? 'Team';

  const isValid =
    Math.max(...scores) === need && Math.min(...scores) < need;
  const isUnchanged =
    match.status === 'done' &&
    scores[0] === match.scoreA &&
    scores[1] === match.scoreB;

  // Saving can change who advances; say so if later results would be lost
  const laterResultsLost = isValid
    ? Object.keys(tournament.results).length -
      Object.keys(recordResult(tournament, match.id, ...scores).results)
        .length +
      (match.status === 'done' ? 0 : 1)
    : 0;

  const setScore = (side: 0 | 1, value: number) =>
    setScores((current) => {
      const next: [number, number] = [...current];
      next[side] = Math.max(0, Math.min(need, value));
      return next;
    });

  const winnerSide =
    scores[0] === need && scores[1] < need
      ? 0
      : scores[1] === need && scores[0] < need
      ? 1
      : null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='result-title'
      className='modal-backdrop'
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className='modal-panel max-w-md'>
        <div className='modal-header'>
          <div>
            <h2 id='result-title' className='modal-title'>
              {matchLabel(tournament, match)}
            </h2>
            <p className='subtle mt-1'>
              Best of {match.bestOf}, first to {need}{' '}
              {need === 1 ? 'map' : 'maps'}
            </p>
          </div>
          <button onClick={onClose} className='icon-btn' aria-label='Close'>
            <X size={18} />
          </button>
        </div>

        <div className='space-y-3 p-6'>
          {([0, 1] as const).map((side) => {
            const teamId = side === 0 ? match.teamA : match.teamB;
            return (
              <div
                key={side}
                className={clsx(
                  'flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
                  winnerSide === side
                    ? 'border-accent bg-accent/10'
                    : 'border-line'
                )}
              >
                <span className='min-w-0 flex-1 truncate font-semibold'>
                  {name(teamId)}
                </span>
                <button
                  type='button'
                  className='icon-btn border border-line'
                  onClick={() => setScore(side, scores[side] - 1)}
                  disabled={scores[side] === 0}
                  aria-label={`One map fewer for ${name(teamId)}`}
                >
                  <Minus size={15} />
                </button>
                <output
                  className='w-8 text-center font-display text-4xl font-bold leading-none'
                  aria-live='polite'
                >
                  {scores[side]}
                </output>
                <button
                  type='button'
                  className='icon-btn border border-line'
                  onClick={() => setScore(side, scores[side] + 1)}
                  disabled={scores[side] === need}
                  aria-label={`One map more for ${name(teamId)}`}
                >
                  <Plus size={15} />
                </button>
              </div>
            );
          })}

          <p className='subtle min-h-[1.25rem]'>
            {winnerSide !== null
              ? `${name(winnerSide === 0 ? match.teamA : match.teamB)} win ${Math.max(...scores)} to ${Math.min(...scores)}.`
              : Math.max(...scores) === need
              ? 'Only one team can reach the winning score.'
              : `Enter the final score: the winner has ${need}.`}
          </p>

          {laterResultsLost > 0 && !isUnchanged && (
            <p className='notice-warn'>
              This changes who moves on, so {laterResultsLost} later{' '}
              {laterResultsLost === 1 ? 'result' : 'results'} will be
              cleared.
            </p>
          )}
        </div>

        <div className='flex items-center justify-between gap-2 border-t border-line px-6 py-4'>
          {match.status === 'done' ? (
            <button onClick={onClear} className='btn-ghost -ml-3 hover:text-bad'>
              Clear result
            </button>
          ) : (
            <span />
          )}
          <div className='flex gap-2'>
            <button onClick={onClose} className='btn-ghost'>
              Cancel
            </button>
            <button
              onClick={() => onSave(...scores)}
              disabled={!isValid || isUnchanged}
              className='btn-primary'
            >
              Save result
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
