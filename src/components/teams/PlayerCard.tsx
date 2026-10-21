import React from 'react';
import { Lock } from 'lucide-react';
import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';

interface Player {
  id: number;
  name: string;
  skillLevel?: string;
  isReserve?: boolean;
}

interface PlayerCardProps {
  player: Player;
  isDraggable: boolean;
  onDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    playerId: number
  ) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  isSelected?: boolean;
  // Tap/click/keyboard alternative to dragging (drag and drop does
  // not work on touch devices)
  onSelect?: (playerId: number) => void;
}

export default function PlayerCard({
  player,
  isDraggable,
  onDragStart,
  onDragEnd,
  isSelected = false,
  onSelect,
}: PlayerCardProps) {
  const {
    players,
    skillBalancingEnabled,
    skillCategories,
  } = useStore(
    useShallow((state) => ({
      players: state.players,
      skillBalancingEnabled: state.skillBalancingEnabled,
      skillCategories: state.skillCategories,
    }))
  );

  // Get full player data from store
  const playerData = players.find((p) => p.id === player.id);
  if (!playerData) return null;

  // Get skill category info if skill balancing is enabled
  const getSkillCategoryInfo = (skillCategoryId?: string) => {
    return skillCategories.find((cat) => cat.id === skillCategoryId);
  };

  const skillInfo =
    skillBalancingEnabled && playerData.skillLevel
      ? getSkillCategoryInfo(playerData.skillLevel)
      : null;

  // Don't render reserve players in team displays
  if (playerData.isReserve) {
    return null;
  }

  const isSelectable = isDraggable && onSelect !== undefined;

  return (
    <div
      draggable={isDraggable}
      onDragStart={(e) => isDraggable && onDragStart(e, player.id)}
      onDragEnd={onDragEnd}
      {...(isSelectable && {
        role: 'button',
        tabIndex: 0,
        'aria-pressed': isSelected,
        title: isSelected
          ? 'Selected: choose a team to move to'
          : 'Select to move',
        onClick: () => onSelect(player.id),
        onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(player.id);
          }
        },
      })}
      className={clsx(
        'flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors',
        isSelected && 'ring-2 ring-accent ring-offset-1 ring-offset-surface',
        playerData.locked
          ? 'cursor-not-allowed border-gold/50 bg-gold/15'
          : 'cursor-grab border-line bg-paper/60 hover:border-muted/50 active:cursor-grabbing'
      )}
    >
      {skillInfo && (
        <span
          className='dot'
          style={{ backgroundColor: skillInfo.color }}
          title={skillInfo.name}
        />
      )}

      <span className='min-w-0 flex-1 select-none truncate font-medium'>
        {playerData.name}
      </span>

      {playerData.locked && (
        <Lock
          size={14}
          className='shrink-0 text-gold'
          aria-label='Locked'
        />
      )}
    </div>
  );
}
