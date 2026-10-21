import PlayerRow from './PlayerRow';
import { Player } from '../../types';

interface ReservePlayersListProps {
  players: Player[];
  onEditPlayer: (player: Player) => void;
}

export default function ReservePlayersList({
  players,
  onEditPlayer,
}: ReservePlayersListProps) {
  return (
    <section aria-labelledby='reserve-players-heading'>
      <h3
        id='reserve-players-heading'
        className='mb-2 flex items-baseline justify-between font-semibold'
      >
        On the bench
        <span className='font-display text-2xl font-bold leading-none'>
          {players.length}
        </span>
      </h3>

      {players.length === 0 ? (
        <p className='rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted'>
          No reserves. Move a player here from their row, or add new
          players as reserves.
        </p>
      ) : (
        <ol className='scrollbar-custom -mr-2 max-h-60 space-y-1 overflow-y-auto pr-2'>
          {players.map((player, index) => (
            <PlayerRow
              key={player.id}
              player={player}
              index={index}
              type='reserve'
              onEdit={onEditPlayer}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
