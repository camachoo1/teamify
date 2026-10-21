import { useState } from 'react';
import { Shuffle } from 'lucide-react';
import clsx from 'clsx';
import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import {
  DEFAULT_SETTINGS,
  SERIES_LENGTHS,
  buildGroups,
  createTournament,
  minimumTeams,
  resolveMatches,
} from '../../tournament/engine';
import {
  SeriesKey,
  TournamentFormat,
  TournamentSettings,
} from '../../tournament/types';
import { shuffle } from '../../utils/helper';
import { getTeamColor } from '../../utils/teamColors';
import Switch from '../ui/Switch';
import Stepper from '../ui/Stepper';

const FORMATS: { value: TournamentFormat; label: string }[] = [
  { value: 'single', label: 'Single elimination' },
  { value: 'double', label: 'Double elimination' },
  { value: 'groups', label: 'Groups, then bracket' },
];

const OVERRIDE_LABELS: Record<SeriesKey, string> = {
  groups: 'Group matches',
  semifinal: 'Semifinals',
  final: 'Final',
  upperFinal: 'Upper final',
  lowerFinal: 'Lower final',
  grandFinal: 'Grand final',
  reset: 'Grand final reset',
};

interface BestOfPickerProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  allowDefault?: boolean;
}

function BestOfPicker({
  label,
  value,
  onChange,
  allowDefault = false,
}: BestOfPickerProps) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-2 py-2.5'>
      <span className='font-semibold'>{label}</span>
      <div className='segmented' role='group' aria-label={label}>
        {allowDefault && (
          <button
            type='button'
            aria-pressed={value === undefined}
            onClick={() => onChange(undefined)}
          >
            Same
          </button>
        )}
        {SERIES_LENGTHS.map((length) => (
          <button
            key={length}
            type='button'
            aria-pressed={value === length}
            onClick={() => onChange(length)}
          >
            Bo{length}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TournamentSetup() {
  const { teams, startTournament, setActiveView } = useStore(
    useShallow((state) => ({
      teams: state.teams,
      startTournament: state.startTournament,
      setActiveView: state.setActiveView,
    }))
  );

  const [settings, setSettings] =
    useState<TournamentSettings>(DEFAULT_SETTINGS);
  const [seeding, setSeeding] = useState<number[]>(() =>
    shuffle(teams.map((t) => t.id))
  );
  const [lowerIds, setLowerIds] = useState<number[]>([]);
  const [swapFrom, setSwapFrom] = useState<number | null>(null);

  // Keep the draw in step with the teams (added or removed teams)
  const teamIds = teams.map((t) => t.id);
  const draw = [
    ...seeding.filter((id) => teamIds.includes(id)),
    ...teamIds.filter((id) => !seeding.includes(id)),
  ];

  const update = (changes: Partial<TournamentSettings>) =>
    setSettings((current) => ({ ...current, ...changes }));
  const setOverride = (key: SeriesKey, value: number | undefined) =>
    setSettings((current) => {
      const bestOfOverrides = { ...current.bestOfOverrides };
      if (value === undefined) delete bestOfOverrides[key];
      else bestOfOverrides[key] = value;
      return { ...current, bestOfOverrides };
    });

  const isGroups = settings.format === 'groups';
  const bracketFormat = isGroups ? settings.bracketFormat : settings.format;
  const isDouble = bracketFormat === 'double';
  const useSplitPicker = settings.format === 'double' && settings.splitStart;
  const lower = useSplitPicker ? lowerIds.filter((id) => draw.includes(id)) : [];

  const overrideKeys: SeriesKey[] = [
    ...(isGroups ? (['groups'] as SeriesKey[]) : []),
    ...((isDouble
      ? [
          'upperFinal',
          'lowerFinal',
          'grandFinal',
          ...(settings.bracketReset ? ['reset'] : []),
        ]
      : ['semifinal', 'final']) as SeriesKey[]),
  ];

  const groupCount = Math.max(
    1,
    Math.ceil(draw.length / settings.groupSize)
  );
  const advancing = groupCount * settings.advancePerGroup;

  // Why the tournament can't start yet, if it can't
  const problem =
    draw.length < minimumTeams(settings)
      ? `You need at least ${minimumTeams(settings)} teams for this format. You have ${draw.length}.`
      : isGroups && settings.advancePerGroup >= Math.ceil(draw.length / groupCount)
      ? 'Fewer teams must advance than there are in each group.'
      : isGroups && isDouble && advancing < 3
      ? 'Double elimination needs at least 3 teams in the bracket. Let more teams advance.'
      : useSplitPicker && draw.length - lower.length < 2
      ? 'Keep at least 2 teams in the upper bracket.'
      : useSplitPicker && lower.length === 0
      ? 'Choose which teams start in the lower bracket, or turn off split start.'
      : null;

  // First-round preview built by the real engine: matches between teams
  // from the draw (not ones waiting on earlier results)
  const preview =
    problem || isGroups
      ? null
      : resolveMatches(
          createTournament(
            settings,
            teams.map((t) => ({ id: t.id, name: t.name, players: [] })),
            draw,
            lower
          )
        ).filter((m) =>
          m.sources.every((s) => s.kind === 'team' || s.kind === 'bye')
        );

  const groupsPreview = isGroups && !problem
    ? buildGroups(settings, draw).groups
    : [];

  const teamName = (id: number | null) =>
    teams.find((t) => t.id === id)?.name ?? 'Bye';

  const handleTeamClick = (id: number) => {
    if (swapFrom === null) {
      setSwapFrom(id);
      return;
    }
    if (swapFrom !== id) {
      const next = [...draw];
      const a = next.indexOf(swapFrom);
      const b = next.indexOf(id);
      [next[a], next[b]] = [next[b], next[a]];
      setSeeding(next);
    }
    setSwapFrom(null);
  };

  const teamChip = (id: number | null) =>
    id === null ? (
      <span className='flex-1 px-3 py-1.5 text-sm italic text-muted'>Bye</span>
    ) : (
      <button
        type='button'
        onClick={() => handleTeamClick(id)}
        aria-pressed={swapFrom === id}
        className={clsx(
          'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm font-semibold transition-colors',
          swapFrom === id
            ? 'bg-accent text-accent-ink'
            : 'hover:bg-sunk'
        )}
      >
        <span
          className='dot h-2 w-2'
          style={{
            backgroundColor: getTeamColor(teamIds.indexOf(id)),
          }}
        />
        <span className='truncate'>{teamName(id)}</span>
      </button>
    );

  if (teams.length < 2) {
    return (
      <div className='rounded-panel border-2 border-dashed border-line px-6 py-16 text-center'>
        <p className='font-display text-5xl font-extrabold uppercase leading-none'>
          No teams yet
        </p>
        <p className='mx-auto mb-6 mt-4 max-w-md text-muted'>
          A tournament uses the teams from the Teams tab. Make at least
          two teams, then come back here.
        </p>
        <button
          onClick={() => setActiveView('teams')}
          className='btn-primary'
        >
          Go to teams
        </button>
      </div>
    );
  }

  return (
    <div className='grid items-start gap-8 lg:grid-cols-[minmax(320px,440px)_1fr]'>
      {/* Settings */}
      <div className='panel space-y-6'>
        <div>
          <h2 className='section-title'>New tournament</h2>
          <p className='subtle mt-1'>
            {draw.length} teams from the Teams tab.
          </p>
        </div>

        <fieldset>
          <legend className='field-label'>Format</legend>
          <div className='grid gap-2'>
            {FORMATS.map((format) => (
              <label
                key={format.value}
                className={clsx(
                  'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 font-semibold transition-colors',
                  settings.format === format.value
                    ? 'border-accent bg-accent/10'
                    : 'border-line hover:bg-sunk/60'
                )}
              >
                <input
                  type='radio'
                  name='format'
                  checked={settings.format === format.value}
                  onChange={() => update({ format: format.value })}
                  className='h-4 w-4 accent-[rgb(var(--accent))]'
                />
                {format.label}
              </label>
            ))}
          </div>
        </fieldset>

        {isGroups && (
          <fieldset className='space-y-4'>
            <legend className='field-label'>Groups</legend>
            <div className='flex flex-wrap gap-x-8 gap-y-4'>
              <Stepper
                label='Teams per group'
                value={settings.groupSize}
                min={3}
                max={8}
                onChange={(groupSize) =>
                  update({
                    groupSize,
                    advancePerGroup: Math.min(
                      settings.advancePerGroup,
                      groupSize - 1
                    ),
                  })
                }
              />
              <Stepper
                label='Advance from each'
                value={settings.advancePerGroup}
                min={1}
                max={settings.groupSize - 1}
                onChange={(advancePerGroup) => update({ advancePerGroup })}
              />
            </div>
            <p className='subtle'>
              {groupCount} {groupCount === 1 ? 'group' : 'groups'}, each
              team plays the others in its group once. {advancing} teams
              reach the bracket.
            </p>
            <div>
              <p className='mb-1 text-sm text-muted'>Bracket after groups</p>
              <div className='segmented' role='group' aria-label='Bracket after groups'>
                <button
                  type='button'
                  aria-pressed={settings.bracketFormat === 'single'}
                  onClick={() => update({ bracketFormat: 'single' })}
                >
                  Single elimination
                </button>
                <button
                  type='button'
                  aria-pressed={settings.bracketFormat === 'double'}
                  onClick={() => update({ bracketFormat: 'double' })}
                >
                  Double elimination
                </button>
              </div>
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className='field-label'>Series length</legend>
          <div className='divide-y divide-line rounded-xl border border-line px-4'>
            <BestOfPicker
              label='Every series'
              value={settings.bestOf}
              onChange={(value) => update({ bestOf: value ?? 3 })}
            />
            {overrideKeys.map((key) => (
              <BestOfPicker
                key={key}
                label={OVERRIDE_LABELS[key]}
                value={settings.bestOfOverrides[key]}
                onChange={(value) => setOverride(key, value)}
                allowDefault
              />
            ))}
          </div>
          <p className='subtle mt-1.5'>
            Same uses the length for every series
            {overrideKeys.includes('reset')
              ? '; the reset follows the grand final unless you set it'
              : ''}
            .
          </p>
        </fieldset>

        {isDouble && (
          <fieldset className='divide-y divide-line'>
            <legend className='field-label'>Double elimination</legend>
            <div className='flex items-center gap-3 py-3'>
              <div className='flex-1'>
                <p className='font-semibold'>Bracket reset</p>
                <p className='subtle'>
                  If the lower-bracket team wins the grand final, play a
                  second one.
                </p>
              </div>
              <Switch
                checked={settings.bracketReset}
                onChange={() =>
                  update({ bracketReset: !settings.bracketReset })
                }
                label='Bracket reset'
              />
            </div>
            <div className='flex items-center gap-3 py-3'>
              <div className='flex-1'>
                <p className='font-semibold'>Split start</p>
                <p className='subtle'>
                  {isGroups
                    ? 'Group winners start in the upper bracket, the other advancing teams in the lower.'
                    : 'Some teams start in the lower bracket. Choose them in the draw.'}
                </p>
              </div>
              <Switch
                checked={settings.splitStart}
                onChange={() => {
                  const splitStart = !settings.splitStart;
                  update({ splitStart });
                  // Default split: the second half of the draw starts lower
                  if (splitStart && !isGroups && lower.length === 0) {
                    setLowerIds(draw.slice(Math.ceil(draw.length / 2)));
                  }
                }}
                label='Split start'
              />
            </div>
          </fieldset>
        )}
      </div>

      {/* Draw */}
      <div className='min-w-0 space-y-4'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h2 className='section-title'>
              {isGroups ? 'Groups' : 'First round'}
            </h2>
            <p className='subtle mt-1 max-w-prose'>
              Teams are drawn at random. Select one team, then another,
              to swap them.
            </p>
          </div>
          <button
            type='button'
            onClick={() => {
              setSeeding(shuffle(draw));
              setSwapFrom(null);
            }}
            className='btn-outline'
          >
            <Shuffle size={16} />
            Shuffle again
          </button>
        </div>

        {useSplitPicker && (
          <div className='panel'>
            <p className='mb-2 font-semibold'>Where each team starts</p>
            <ul className='grid gap-1.5 sm:grid-cols-2'>
              {draw.map((id) => {
                const isLower = lower.includes(id);
                return (
                  <li
                    key={id}
                    className='flex items-center justify-between gap-2 rounded-lg bg-paper/60 px-3 py-1.5'
                  >
                    <span className='truncate text-sm font-semibold'>
                      {teamName(id)}
                    </span>
                    <span
                      className='segmented shrink-0 scale-90'
                      role='group'
                      aria-label={`${teamName(id)} starts in`}
                    >
                      <button
                        type='button'
                        aria-pressed={!isLower}
                        onClick={() =>
                          setLowerIds(lowerIds.filter((x) => x !== id))
                        }
                      >
                        Upper
                      </button>
                      <button
                        type='button'
                        aria-pressed={isLower}
                        onClick={() =>
                          setLowerIds([
                            ...lowerIds.filter((x) => x !== id),
                            id,
                          ])
                        }
                      >
                        Lower
                      </button>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {problem ? (
          <p className='notice-warn'>{problem}</p>
        ) : isGroups ? (
          <div className='grid gap-3 sm:grid-cols-2'>
            {groupsPreview.map((group) => (
              <div key={group.id} className='panel p-4 sm:p-4'>
                <p className='mb-2 font-display text-xl font-bold'>
                  {group.name}
                </p>
                <ul className='space-y-1'>
                  {group.teamIds.map((id) => (
                    <li key={id} className='flex'>
                      {teamChip(id)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className='grid gap-3 sm:grid-cols-2'>
            {preview?.map((match) => (
              <div
                key={match.id}
                className='rounded-2xl border border-line bg-surface p-2'
              >
                <p className='subtle px-3 pb-1 pt-0.5'>
                  {match.stage === 'lower' ? 'Lower bracket' : 'Match'}{' '}
                  {match.order}
                </p>
                <div className='flex items-center gap-1'>
                  {teamChip(match.teamA)}
                  <span className='text-xs text-muted'>vs</span>
                  {teamChip(match.teamB)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className='flex justify-end'>
          <button
            onClick={() => startTournament(settings, draw, lower)}
            disabled={problem !== null}
            className='btn-primary h-12 px-6 text-base'
          >
            Start tournament
          </button>
        </div>
      </div>
    </div>
  );
}
