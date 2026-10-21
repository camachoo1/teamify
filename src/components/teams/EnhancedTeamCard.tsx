import clsx from 'clsx';
import { Edit2, Trash2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Team, Player } from '../../types';
import { validateTeamComposition } from '../../utils/helper';
import PlayerCard from './PlayerCard';
import { getTeamColor } from '../../utils/teamColors';
import {
  ValidationStatus,
  TeamCompositionWarning,
} from './validations';

interface EnhancedTeamCardProps {
  team: Team;
  teamIndex: number;
  dragOverTeam: number | null;
  editingTeamId: number | null;
  manualTeamMode: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: (
    e: React.DragEvent<HTMLDivElement>,
    teamIndex: number
  ) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (
    e: React.DragEvent<HTMLDivElement>,
    teamIndex: number
  ) => void;
  onTeamNameEdit: (teamId: number, newName: string) => void;
  onRemoveTeam: (teamId: number) => void;
  onEditTeam: (teamId: number) => void;
  onDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    playerId: number
  ) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  selectedPlayerId: number | null;
  onSelectPlayer: (playerId: number) => void;
  onPlaceSelected: (teamIndex: number) => void;
}

export const EnhancedTeamCard = ({
  team,
  teamIndex,
  dragOverTeam,
  editingTeamId,
  manualTeamMode,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onTeamNameEdit,
  onRemoveTeam,
  onEditTeam,
  onDragStart,
  onDragEnd,
  selectedPlayerId,
  onSelectPlayer,
  onPlaceSelected,
}: EnhancedTeamCardProps) => {
  const {
    players,
    skillCategories,
    teamCompositionRules,
    skillBalancingEnabled,
  } = useStore(
    useShallow((state) => ({
      players: state.players,
      skillCategories: state.skillCategories,
      teamCompositionRules: state.teamCompositionRules,
      skillBalancingEnabled: state.skillBalancingEnabled,
    }))
  );

  const validation = validateTeamComposition(
    team,
    players,
    skillCategories,
    teamCompositionRules,
    skillBalancingEnabled
  );

  // Get skill category counts for display
  const getTeamSkillDistribution = (teamPlayers: Player[]) => {
    if (!skillBalancingEnabled || skillCategories.length === 0)
      return null;

    const distribution = skillCategories
      .map((category) => ({
        ...category,
        count: teamPlayers.filter((p) => {
          const playerData = players.find((pd) => pd.id === p.id);
          return playerData?.skillLevel === category.id;
        }).length,
      }))
      .filter((cat) => cat.count > 0);

    return distribution;
  };

  const skillDistribution = getTeamSkillDistribution(team.players);
  const hasValidationIssues =
    !validation.isValid && skillBalancingEnabled;
  const canPlaceSelected =
    selectedPlayerId !== null &&
    !team.players.some((p) => p.id === selectedPlayerId);

  const teamColor = getTeamColor(teamIndex);

  return (
    <div
      role='group'
      aria-label={team.name}
      className={clsx(
        'group relative animate-deal overflow-hidden rounded-[18px] border bg-surface transition-shadow',
        hasValidationIssues ? 'border-bad/60' : 'border-line',
        dragOverTeam === teamIndex &&
          'ring-2 ring-accent ring-offset-2 ring-offset-paper'
      )}
      style={{ animationDelay: `${Math.min(teamIndex, 8) * 60}ms` }}
      onDragOver={onDragOver}
      onDragEnter={(e) => onDragEnter(e, teamIndex)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, teamIndex)}
    >
      <div className='h-2' style={{ backgroundColor: teamColor }} />

      <div className='p-5'>
        {/* Team Header */}
        <div className='mb-4 flex items-start gap-3'>
          <span
            className='font-display text-5xl font-black leading-[0.8]'
            style={{ color: teamColor }}
            aria-hidden='true'
          >
            {teamIndex + 1}
          </span>

          <div className='min-w-0 flex-1'>
            {editingTeamId === team.id ? (
              <input
                type='text'
                defaultValue={team.name}
                aria-label='Team name'
                className='input-field h-9 px-3 font-semibold'
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => onTeamNameEdit(team.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onTeamNameEdit(team.id, e.currentTarget.value);
                  } else if (e.key === 'Escape') {
                    onEditTeam(-1); // Clear editing
                  }
                }}
              />
            ) : (
              <h3>
                <button
                  type='button'
                  className='flex max-w-full items-center gap-1.5 text-left font-display text-2xl font-bold leading-tight hover:text-accent'
                  onClick={() => onEditTeam(team.id)}
                  title='Rename team'
                >
                  <span className='truncate'>{team.name}</span>
                  <Edit2
                    size={13}
                    className='shrink-0 text-muted opacity-60 [@media(hover:hover)]:opacity-0 group-hover:opacity-60 group-focus-within:opacity-60'
                  />
                </button>
              </h3>
            )}
            <p className='flex items-center gap-2 text-sm text-muted'>
              {team.players.length}{' '}
              {team.players.length === 1 ? 'player' : 'players'}
              {skillBalancingEnabled &&
                Object.keys(teamCompositionRules).length > 0 && (
                  <ValidationStatus
                    isValid={validation.isValid}
                    violations={validation.violations}
                  />
                )}
            </p>
          </div>

          {canPlaceSelected && (
            <button
              type='button'
              onClick={() => onPlaceSelected(teamIndex)}
              className='btn-secondary h-8 px-3 text-xs'
            >
              Move here
            </button>
          )}

          {manualTeamMode && (
            <button
              onClick={() => onRemoveTeam(team.id)}
              className='icon-btn h-8 w-8 transition-opacity hover:text-bad [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus:opacity-100'
              title='Delete team'
              aria-label={`Delete ${team.name}`}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* Team Composition Warning */}
        {hasValidationIssues && (
          <TeamCompositionWarning
            violations={validation.violations}
            skillDistribution={validation.skillDistribution}
            skillCategories={skillCategories}
          />
        )}

        {/* Skill Distribution */}
        {skillDistribution && skillDistribution.length > 0 && (
          <ul className='mb-3 flex flex-wrap gap-1.5'>
            {skillDistribution.map((skill) => {
              const ruleInfo = validation.skillDistribution[skill.id];
              const hasIssue =
                ruleInfo && ruleInfo.actual !== ruleInfo.required;

              return (
                <li
                  key={skill.id}
                  className={clsx(
                    'chip font-medium',
                    hasIssue && 'bg-bad/15 text-bad'
                  )}
                  title={
                    ruleInfo
                      ? `${skill.name}: ${ruleInfo.actual} of ${ruleInfo.required} required`
                      : `${skill.name}: ${skill.count} players`
                  }
                >
                  <span
                    className='dot h-2 w-2'
                    style={{ backgroundColor: skill.color }}
                  />
                  {skill.count}
                  {ruleInfo && `/${ruleInfo.required}`}
                </li>
              );
            })}
          </ul>
        )}

        {/* Players */}
        {team.players.length === 0 ? (
          <div className='grid min-h-[7rem] place-items-center rounded-xl border-2 border-dashed border-line px-4 text-center text-sm text-muted'>
            {manualTeamMode
              ? 'Drag players here, or select one and choose Move here.'
              : 'Drop players here'}
          </div>
        ) : (
          <div className='space-y-1.5'>
            {team.players.map((player) => {
              const playerData = players.find(
                (p) => p.id === player.id
              );
              if (!playerData) return null;

              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isDraggable={!playerData.locked}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  isSelected={selectedPlayerId === player.id}
                  onSelect={onSelectPlayer}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
