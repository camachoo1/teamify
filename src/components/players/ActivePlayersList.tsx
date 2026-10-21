import PlayerRow from './PlayerRow';
import { Player } from '../../types';

interface ActivePlayersListProps {
  players: Player[];
  onEditPlayer: (player: Player) => void;
}

export default function ActivePlayersList({
  players,
  onEditPlayer,
}: ActivePlayersListProps) {
  return (
    <section aria-labelledby='active-players-heading'>
      <h3
        id='active-players-heading'
        className='mb-2 flex items-baseline justify-between font-semibold'
      >
        Playing
        <span className='font-display text-2xl font-bold leading-none'>
          {players.length}
        </span>
      </h3>

      {players.length === 0 ? (
        <p className='rounded-2xl border border-dashed border-line px-4 py-6 text-center text-muted'>
          No players yet. Use Add players to start your list.
        </p>
      ) : (
        <ol className='scrollbar-custom -mr-2 max-h-[26rem] space-y-1 overflow-y-auto pr-2'>
          {players.map((player, index) => (
            <PlayerRow
              key={player.id}
              player={player}
              index={index}
              type='active'
              onEdit={onEditPlayer}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
