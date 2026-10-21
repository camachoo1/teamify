import ConfirmDialog from '../components/ui/ConfirmDialog';

interface DeleteTeamConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  teamId: number;
}

export default function DeleteTeamConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteTeamConfirmModalProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title='Delete this team?'
      description='Its players move back to Unassigned.'
      confirmLabel='Delete team'
    />
  );
}
