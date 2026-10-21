import { useEffect } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** A small destructive-action confirmation, closed with Escape or Cancel. */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () =>
        document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role='alertdialog'
      aria-modal='true'
      aria-labelledby='confirm-title'
      aria-describedby='confirm-description'
      className='modal-backdrop'
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className='modal-panel max-w-md p-6'>
        <h3 id='confirm-title' className='modal-title'>
          {title}
        </h3>
        <p id='confirm-description' className='mt-2 text-muted'>
          {description}
        </p>
        <div className='mt-6 flex justify-end gap-2'>
          <button onClick={onClose} className='btn-ghost' autoFocus>
            Cancel
          </button>
          <button onClick={onConfirm} className='btn-danger'>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
