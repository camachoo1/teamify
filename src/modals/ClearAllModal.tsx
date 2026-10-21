import ConfirmDialog from '../components/ui/ConfirmDialog';

interface ClearAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ClearAllModal({
  isOpen,
  onClose,
  onConfirm,
}: ClearAllModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title='Clear everything?'
      description="This removes the event name, organizer, every player, every team and the tournament. It can't be undone."
      confirmLabel='Clear everything'
    />
  );
}
