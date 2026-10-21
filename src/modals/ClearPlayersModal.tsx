import ConfirmDialog from '../components/ui/ConfirmDialog';

interface ClearPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  playerCount: number;
}

export default function ClearPlayersModal({
  isOpen,
  onClose,
  onConfirm,
  playerCount,
}: ClearPlayersModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title='Remove all players?'
      description={`This removes all ${playerCount} players and empties every team. Your event name and settings stay.`}
      confirmLabel='Remove players'
    />
  );
}
