import { useState } from 'react';
import { ChevronDown, Trophy } from 'lucide-react';
import clsx from 'clsx';
import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import {
  advancingTeams,
  getChampion,
  groupStageComplete,
  groupStandings,
  resolveMatches,
  seriesLength,
} from '../../tournament/engine';
import { ResolvedMatch, Tournament } from '../../tournament/types';
import ConfirmDialog from '../ui/ConfirmDialog';
import BracketView from './BracketView';
import GroupStage from './GroupStage';
import ResultDialog from './ResultDialog';

const FORMAT_NAMES = {
  single: 'Single elimination',
  double: 'Double elimination',
};

// e.g. "Groups, then double elimination. Bo5; grand final Bo7."
const describe = (tournament: Tournament): string => {
  const { settings } = tournament;
  const bracket = settings.format === 'groups'
    ? settings.bracketFormat
    : settings.format;
  const format =
    settings.format === 'groups'
      ? `Groups, then ${FORMAT_NAMES[bracket].toLowerCase()}`
      : FORMAT_NAMES[bracket];
  const finalKey = bracket === 'double' ? 'grandFinal' : 'final';
  const finalLength = seriesLength(settings, finalKey);
  const lengths =
    finalLength === settings.bestOf
      ? `Every series Bo${settings.bestOf}`
      : `Bo${settings.bestOf}, ${
          bracket === 'double' ? 'grand final' : 'final'
        } Bo${finalLength}`;
  const extras = [
    bracket === 'double' && settings.bracketReset && 'bracket reset',
    bracket === 'double' && settings.splitStart && 'split start',
  ].filter(Boolean);
  return `${format}. ${lengths}${
    extras.length ? `, with ${extras.join(' and ')}` : ''
  }.`;
};

export default function TournamentBoard({
  tournament,
}: {
  tournament: Tournament;
}) {
  const {
    recordMatchResult,
    clearMatchResult,
    setGroupTieOrder,
    advanceToBracket,
    endTournament,
  } = useStore(
    useShallow((state) => ({
      recordMatchResult: state.recordMatchResult,
      clearMatchResult: state.clearMatchResult,
      setGroupTieOrder: state.setGroupTieOrder,
      advanceToBracket: state.advanceToBracket,
      endTournament: state.endTournament,
    }))
  );
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showGroups, setShowGroups] = useState(false);

  const resolved = resolveMatches(tournament);
  const openMatch = resolved.find((m) => m.id === openMatchId) ?? null;
  const championId = getChampion(tournament, resolved);
  const champion = tournament.teams.find((t) => t.id === championId);
  const name = (id: number) =>
    tournament.teams.find((t) => t.id === id)?.name ?? 'Team';

  const handleOpen = (match: ResolvedMatch) => setOpenMatchId(match.id);

  // Group stage: can the bracket start?
  const groupsDone =
    tournament.phase === 'groups' && groupStageComplete(tournament, resolved);
  const blockingTie =
    groupsDone &&
    tournament.groups.some((group) =>
      groupStandings(tournament, group.id, resolved).some(
        (row) =>
          row.unresolvedTie &&
          row.rank <= tournament.settings.advancePerGroup
      )
    );
  const groupMatches = resolved.filter((m) => m.stage === 'group');
  const groupMatchesLeft = groupMatches.filter(
    (m) => m.status !== 'done'
  ).length;

  return (
    <div className='space-y-8'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h2 className='section-title text-4xl'>Tournament</h2>
          <p className='subtle mt-1'>{describe(tournament)}</p>
        </div>
        <button
          onClick={() => setConfirmEnd(true)}
          className='btn-ghost hover:text-bad'
        >
          End tournament
        </button>
      </div>

      {champion && (
        <div className='flex flex-wrap items-center gap-5 rounded-panel border-2 border-accent bg-accent/10 px-6 py-5'>
          <Trophy size={40} className='shrink-0 text-accent' />
          <div className='min-w-0'>
            <p className='subtle'>Champion</p>
            <p className='font-display text-5xl font-black uppercase leading-none'>
              {champion.name}
            </p>
            {champion.players.length > 0 && (
              <p className='mt-1 text-muted'>
                {champion.players.join(', ')}
              </p>
            )}
          </div>
        </div>
      )}

      {tournament.phase === 'groups' ? (
        <>
          <GroupStage
            tournament={tournament}
            resolved={resolved}
            onOpenMatch={handleOpen}
            onReorderTie={setGroupTieOrder}
          />
          <div className='panel flex flex-wrap items-center justify-between gap-4'>
            <div>
              <p className='font-semibold'>
                {groupsDone
                  ? blockingTie
                    ? 'Order the tied teams before the bracket'
                    : 'Group stage finished'
                  : `${groupMatchesLeft} group ${
                      groupMatchesLeft === 1 ? 'match' : 'matches'
                    } left`}
              </p>
              <p className='subtle'>
                {groupsDone && !blockingTie
                  ? `${advancingTeams(tournament, resolved)
                      .seeding.map(name)
                      .join(', ')} move on.`
                  : 'Enter every group result to start the bracket.'}
              </p>
            </div>
            <button
              onClick={advanceToBracket}
              disabled={!groupsDone || blockingTie}
              className='btn-primary'
            >
              Start the bracket
            </button>
          </div>
        </>
      ) : (
        <>
          {tournament.groups.length > 0 && (
            <section>
              <button
                type='button'
                onClick={() => setShowGroups(!showGroups)}
                aria-expanded={showGroups}
                className='btn-ghost -ml-3'
              >
                Group results
                <ChevronDown
                  size={16}
                  className={clsx(
                    'transition-transform',
                    showGroups && 'rotate-180'
                  )}
                />
              </button>
              {showGroups && (
                <div className='mt-3'>
                  <GroupStage
                    tournament={tournament}
                    resolved={resolved}
                    onOpenMatch={handleOpen}
                    onReorderTie={setGroupTieOrder}
                    tablesOnly
                  />
                </div>
              )}
            </section>
          )}
          <BracketView
            tournament={tournament}
            resolved={resolved}
            onOpenMatch={handleOpen}
          />
        </>
      )}

      {openMatch && (
        <ResultDialog
          tournament={tournament}
          match={openMatch}
          onClose={() => setOpenMatchId(null)}
          onSave={(scoreA, scoreB) => {
            recordMatchResult(openMatch.id, scoreA, scoreB);
            setOpenMatchId(null);
          }}
          onClear={() => {
            clearMatchResult(openMatch.id);
            setOpenMatchId(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        onConfirm={() => {
          endTournament();
          setConfirmEnd(false);
        }}
        title='End this tournament?'
        description='All results are deleted and you go back to setup. Your teams stay as they are.'
        confirmLabel='End tournament'
      />
    </div>
  );
}
