import { X, Lock, UserX, ArrowUp, Edit2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';
import { Player } from '../../types';

interface PlayerRowProps {
  player: Player;
  index: number;
  type: 'active' | 'reserve';
  onEdit?: (player: Player) => void;
}

export default function PlayerRow({
  player,
  index,
  type,
  onEdit,
}: PlayerRowProps) {
  const {
    removePlayer,
    togglePlayerLock,
    togglePlayerReserve,
    reservePlayersEnabled,
    skillBalancingEnabled,
    skillCategories,
    teamSize,
    maxTeams,
    players,
  } = useStore(
    useShallow((state) => ({
      removePlayer: state.removePlayer,
      togglePlayerLock: state.togglePlayerLock,
      togglePlayerReserve: state.togglePlayerReserve,
      reservePlayersEnabled: state.reservePlayersEnabled,
      skillBalancingEnabled: state.skillBalancingEnabled,
      skillCategories: state.skillCategories,
      teamSize: state.teamSize,
      maxTeams: state.maxTeams,
      players: state.players,
    }))
  );

  // Calculate capacity for reserves
  const activePlayers = players.filter((p) => !p.isReserve);
  const maxActiveSlots =
    maxTeams > 0 ? maxTeams * teamSize : Infinity;
  const isAtCapacity = activePlayers.length >= maxActiveSlots;

  const getSkillCategoryInfo = (skillCategoryId?: string) => {
    return skillCategories.find((cat) => cat.id === skillCategoryId);
  };

  const skillInfo =
    skillBalancingEnabled && player.skillLevel
      ? getSkillCategoryInfo(player.skillLevel)
      : null;

  const isReserve = type === 'reserve';
  const actionsClass =
    'flex shrink-0 items-center transition-opacity [@media(hover:hover)]:opacity-0 group-hover:opacity-100 focus-within:opacity-100';

  return (
    <li
      className={clsx(
        'group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-sunk/70',
        player.locked && !isReserve && 'bg-gold/15'
      )}
    >
      <span className='w-6 shrink-0 text-right text-sm tabular-nums text-muted'>
        {index + 1}
      </span>

      {skillInfo && (
        <span
          className='dot'
          style={{ backgroundColor: skillInfo.color }}
          title={skillInfo.name}
        />
      )}

      <span
        className={clsx(
          'min-w-0 flex-1 truncate',
          player.locked && !isReserve ? 'font-semibold' : 'font-medium',
          isReserve && 'text-muted'
        )}
      >
        {player.name}
      </span>

      {player.locked && !isReserve && (
        <Lock
          size={14}
          className='shrink-0 text-gold'
          aria-label='Locked to their team'
        />
      )}

      <div className={actionsClass}>
        <button
          onClick={() => onEdit?.(player)}
          className='icon-btn h-8 w-8'
          title='Edit player'
          aria-label={`Edit ${player.name}`}
        >
          <Edit2 size={14} />
        </button>

        {isReserve ? (
          <>
            <button
              onClick={() => togglePlayerReserve(player.id)}
              disabled={isAtCapacity}
              className='icon-btn h-8 w-8'
              title={
                isAtCapacity
                  ? 'Teams are full'
                  : 'Move into the playing list'
              }
              aria-label={`Move ${player.name} into the playing list`}
            >
              <ArrowUp size={14} />
            </button>
            <button
              onClick={() => removePlayer(player.id)}
              className='icon-btn h-8 w-8 hover:text-bad'
              title='Remove player'
              aria-label={`Remove ${player.name}`}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            {reservePlayersEnabled && (
              <button
                onClick={() => togglePlayerReserve(player.id)}
                className='icon-btn h-8 w-8'
                title='Move to the bench'
                aria-label={`Move ${player.name} to the bench`}
              >
                <UserX size={14} />
              </button>
            )}
            <button
              onClick={() => togglePlayerLock(player.id)}
              className={clsx(
                'icon-btn h-8 w-8',
                player.locked && 'text-gold hover:text-gold'
              )}
              title={
                player.locked
                  ? 'Unlock: let randomize move this player'
                  : 'Lock: keep this player on their team'
              }
              aria-label={
                player.locked
                  ? `Unlock ${player.name}`
                  : `Lock ${player.name}`
              }
              aria-pressed={player.locked}
            >
              <Lock size={14} />
            </button>
            <button
              onClick={() => removePlayer(player.id)}
              className='icon-btn h-8 w-8 hover:text-bad'
              disabled={player.locked}
              title={
                player.locked ? 'Unlock to remove' : 'Remove player'
              }
              aria-label={`Remove ${player.name}`}
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
