import { useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Grid3X3,
  List,
  ScrollText,
} from 'lucide-react';
import clsx from 'clsx';
import { Player } from '../../types';
import PlayerCard from './PlayerCard';

interface UnassignedPlayersPoolProps {
  players: Player[];
  dragOverTeam: number | null;
  onDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    playerId: number
  ) => void;
  onDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  selectedPlayerId: number | null;
  onSelectPlayer: (playerId: number) => void;
  // Set when the selected player is on a team and can be unassigned
  onUnassignSelected?: () => void;
}

type LayoutType = 'grid' | 'compact' | 'scrollable';

// Compact Player Component for dense layouts
const CompactPlayerCard = ({
  player,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  player: Player;
  isSelected: boolean;
  onSelect: (playerId: number) => void;
  onDragStart: UnassignedPlayersPoolProps['onDragStart'];
  onDragEnd: UnassignedPlayersPoolProps['onDragEnd'];
}) => (
  <div
    draggable={!player.locked}
    onDragStart={(e) => onDragStart(e, player.id)}
    onDragEnd={onDragEnd}
    {...(!player.locked && {
      role: 'button',
      tabIndex: 0,
      'aria-pressed': isSelected,
      onClick: () => onSelect(player.id),
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(player.id);
        }
      },
    })}
    className={clsx(
      'min-w-0 cursor-grab truncate rounded-lg border border-line bg-surface px-2 py-1 text-center text-xs font-medium',
      isSelected && 'ring-2 ring-accent',
      player.locked && 'cursor-not-allowed opacity-50'
    )}
    title={player.name}
  >
    {player.name}
  </div>
);

const LayoutToggleButton = ({
  layout,
  currentLayout,
  icon,
  title,
  onClick,
}: {
  layout: LayoutType;
  currentLayout: LayoutType;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className='!px-2.5'
    title={title}
    aria-label={title}
    aria-pressed={currentLayout === layout}
  >
    {icon}
  </button>
);

export default function UnassignedPlayersPool({
  players,
  dragOverTeam,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  selectedPlayerId,
  onSelectPlayer,
  onUnassignSelected,
}: UnassignedPlayersPoolProps) {
  const [showUnassigned, setShowUnassigned] = useState(true);
  const [unassignedLayout, setUnassignedLayout] =
    useState<LayoutType>('grid');

  return (
    <div
      className={clsx(
        'rounded-panel border-2 border-dashed p-5 transition-colors',
        dragOverTeam === -1
          ? 'border-accent bg-accent/5'
          : 'border-gold/60 bg-gold/10'
      )}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <h3 className='flex-1 font-display text-2xl font-bold leading-none'>
          Unassigned
          <span className='ml-2 text-muted'>{players.length}</span>
        </h3>

        {onUnassignSelected && (
          <button
            type='button'
            onClick={onUnassignSelected}
            className='btn-secondary h-8 px-3 text-xs'
          >
            Unassign
          </button>
        )}

        {/* Layout Toggle Buttons */}
        {showUnassigned && players.length > 12 && (
          <div className='segmented' role='group' aria-label='Layout'>
            <LayoutToggleButton
              layout='grid'
              currentLayout={unassignedLayout}
              icon={<Grid3X3 size={14} />}
              title='Cards'
              onClick={() => setUnassignedLayout('grid')}
            />
            <LayoutToggleButton
              layout='compact'
              currentLayout={unassignedLayout}
              icon={<List size={14} />}
              title='Names only'
              onClick={() => setUnassignedLayout('compact')}
            />
            <LayoutToggleButton
              layout='scrollable'
              currentLayout={unassignedLayout}
              icon={<ScrollText size={14} />}
              title='One row'
              onClick={() => setUnassignedLayout('scrollable')}
            />
          </div>
        )}

        <button
          onClick={() => setShowUnassigned(!showUnassigned)}
          className='icon-btn h-8 w-8'
          title={showUnassigned ? 'Collapse' : 'Expand'}
          aria-label={
            showUnassigned
              ? 'Collapse unassigned players'
              : 'Expand unassigned players'
          }
          aria-expanded={showUnassigned}
        >
          {showUnassigned ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </button>
      </div>

      {/* Content */}
      {showUnassigned &&
        (players.length === 0 ? (
          <p className='py-4 text-center text-sm text-muted'>
            Everyone is on a team. Drop a player here to take them off
            their team.
          </p>
        ) : (
          <>
            {/* Grid Layout (Default) */}
            {unassignedLayout === 'grid' && (
              <div className='scrollbar-custom grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4'>
                {players.map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isDraggable={!player.locked}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    isSelected={selectedPlayerId === player.id}
                    onSelect={onSelectPlayer}
                  />
                ))}
              </div>
            )}

            {/* Compact Name List */}
            {unassignedLayout === 'compact' && (
              <div className='scrollbar-custom grid max-h-[200px] grid-cols-3 gap-1 overflow-y-auto sm:grid-cols-4 lg:grid-cols-6'>
                {players.map((player) => (
                  <CompactPlayerCard
                    key={player.id}
                    player={player}
                    isSelected={selectedPlayerId === player.id}
                    onSelect={onSelectPlayer}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            )}

            {/* Scrollable Horizontal List */}
            {unassignedLayout === 'scrollable' && (
              <div className='scrollbar-custom overflow-x-auto pb-2'>
                <div className='flex min-w-max gap-2'>
                  {players.map((player) => (
                    <div key={player.id} className='w-44 shrink-0'>
                      <PlayerCard
                        player={player}
                        isDraggable={!player.locked}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        isSelected={selectedPlayerId === player.id}
                        onSelect={onSelectPlayer}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ))}

      {/* Collapsed State */}
      {!showUnassigned && players.length > 0 && (
        <p className='text-sm text-muted'>
          Hidden. Expand to see who still needs a team.
        </p>
      )}
    </div>
  );
}
