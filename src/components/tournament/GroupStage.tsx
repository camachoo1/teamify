import { ArrowDown, ArrowUp } from 'lucide-react';
import clsx from 'clsx';
import {
  ResolvedMatch,
  StandingRow,
  Tournament,
} from '../../tournament/types';
import { groupStandings } from '../../tournament/engine';
import MatchCard from './MatchCard';

interface GroupStageProps {
  tournament: Tournament;
  resolved: ResolvedMatch[];
  onOpenMatch: (match: ResolvedMatch) => void;
  onReorderTie: (groupId: string, teamIds: number[]) => void;
  // After the group stage, show the final tables without matches
  tablesOnly?: boolean;
}

export default function GroupStage({
  tournament,
  resolved,
  onOpenMatch,
  onReorderTie,
  tablesOnly = false,
}: GroupStageProps) {
  const advance = tournament.settings.advancePerGroup;
  const name = (id: number) =>
    tournament.teams.find((t) => t.id === id)?.name ?? 'Team';

  // Swap a tied team with its neighbor. Only the tied teams are saved, so
  // ties that appear later still get flagged.
  const move = (
    groupId: string,
    table: StandingRow[],
    index: number,
    direction: -1 | 1
  ) => {
    const inTie = (i: number) =>
      table[i]?.tiedOnTiebreakers && table[i].wins === table[index].wins;
    let start = index;
    let end = index;
    while (inTie(start - 1)) start--;
    while (inTie(end + 1)) end++;
    const order = table.slice(start, end + 1).map((r) => r.teamId);
    const from = index - start;
    const to = from + direction;
    [order[from], order[to]] = [order[to], order[from]];
    onReorderTie(groupId, order);
  };

  return (
    <div className='grid gap-6 xl:grid-cols-2'>
      {tournament.groups.map((group) => {
        const table = groupStandings(tournament, group.id, resolved);
        const matches = resolved.filter((m) => m.groupId === group.id);
        const rounds = Math.max(...matches.map((m) => m.round), 0);

        return (
          <section
            key={group.id}
            aria-label={group.name}
            className='panel min-w-0'
          >
            <h3 className='mb-3 font-display text-2xl font-bold'>
              {group.name}
            </h3>

            <table className='w-full text-sm'>
              <thead>
                <tr className='text-left text-muted'>
                  <th className='w-8 pb-2 font-semibold'>#</th>
                  <th className='pb-2 font-semibold'>Team</th>
                  <th className='pb-2 text-right font-semibold'>Series</th>
                  <th className='pb-2 text-right font-semibold'>Maps</th>
                  <th className='w-16 pb-2' />
                </tr>
              </thead>
              <tbody>
                {table.map((row, index) => {
                  const diff = row.mapsWon - row.mapsLost;
                  const tiedAbove =
                    !tablesOnly &&
                    index > 0 &&
                    row.tiedOnTiebreakers &&
                    table[index - 1].tiedOnTiebreakers &&
                    table[index - 1].wins === row.wins;
                  const tiedBelow =
                    !tablesOnly &&
                    index < table.length - 1 &&
                    row.tiedOnTiebreakers &&
                    table[index + 1].tiedOnTiebreakers &&
                    table[index + 1].wins === row.wins;
                  return (
                    <tr
                      key={row.teamId}
                      className={clsx(
                        'border-t border-line',
                        row.rank === advance &&
                          'border-b-2 border-b-accent/60'
                      )}
                    >
                      <td className='py-2 tabular-nums text-muted'>
                        {row.rank}
                      </td>
                      <td
                        className={clsx(
                          'py-2',
                          row.rank <= advance && 'font-semibold'
                        )}
                      >
                        {name(row.teamId)}
                        {row.unresolvedTie && (
                          <span className='ml-2 text-xs font-semibold text-gold'>
                            Tied
                          </span>
                        )}
                      </td>
                      <td className='py-2 text-right tabular-nums'>
                        {row.wins}–{row.losses}
                      </td>
                      <td className='py-2 text-right tabular-nums'>
                        {row.mapsWon}–{row.mapsLost}
                        <span className='ml-1 text-muted'>
                          ({diff > 0 ? `+${diff}` : diff})
                        </span>
                      </td>
                      <td className='py-1 text-right'>
                        {tiedAbove && (
                          <button
                            type='button'
                            className='icon-btn h-7 w-7'
                            onClick={() =>
                              move(group.id, table, index, -1)
                            }
                            aria-label={`Move ${name(row.teamId)} up`}
                          >
                            <ArrowUp size={14} />
                          </button>
                        )}
                        {tiedBelow && (
                          <button
                            type='button'
                            className='icon-btn h-7 w-7'
                            onClick={() => move(group.id, table, index, 1)}
                            aria-label={`Move ${name(row.teamId)} down`}
                          >
                            <ArrowDown size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className='subtle mt-2'>
              Top {advance} reach the bracket. Ties go to head-to-head,
              then map difference.
              {table.some((r) => r.unresolvedTie) &&
                ' Teams still level are marked Tied: use the arrows to order them.'}
            </p>

            {!tablesOnly && (
              <div className='mt-4 space-y-4 border-t border-line pt-4'>
                {Array.from({ length: rounds }, (_, i) => i + 1).map(
                  (round) => (
                    <div key={round}>
                      <p className='subtle mb-1 font-semibold'>
                        Round {round}
                      </p>
                      <div className='flex flex-wrap gap-1'>
                        {matches
                          .filter((m) => m.round === round)
                          .map((match) => (
                            <MatchCard
                              key={match.id}
                              tournament={tournament}
                              match={match}
                              onOpen={onOpenMatch}
                            />
                          ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
