import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import ActivePlayersList from './ActivePlayersList';
import ReservePlayersList from './ReservePlayersList';
import { Player } from '../../types';

interface PlayerListsProps {
  onEditPlayer: (player: Player) => void;
}

export default function PlayerLists({
  onEditPlayer,
}: PlayerListsProps) {
  const { players, reservePlayersEnabled } = useStore(
    useShallow((state) => ({
      players: state.players,
      reservePlayersEnabled: state.reservePlayersEnabled,
    }))
  );

  const activePlayers = players.filter((p) => !p.isReserve);
  const reservePlayers = players.filter((p) => p.isReserve);

  return (
    <div className='space-y-6 pt-5'>
      <ActivePlayersList
        players={activePlayers}
        onEditPlayer={onEditPlayer}
      />

      {reservePlayersEnabled && (
        <ReservePlayersList
          players={reservePlayers}
          onEditPlayer={onEditPlayer}
        />
      )}
    </div>
  );
}
