import React, { useCallback, useEffect } from 'react';
import {
  Download,
  CheckCircle,
  XCircle,
  FileText,
  X,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ImportExportModal({
  isOpen,
  onClose,
}: ImportExportModalProps) {
  const {
    eventName,
    exportConfiguration,
    importConfiguration,
    teams,
  } = useStore(
    useShallow((state) => ({
      eventName: state.eventName,
      exportConfiguration: state.exportConfiguration,
      importConfiguration: state.importConfiguration,
      teams: state.teams,
    }))
  );
  const [status, setStatus] = React.useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [exported, setExported] = React.useState(false);

  const handleExport = () => {
    const jsonData = exportConfiguration();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const fileName = `teams-${eventName || 'config'}-${
      new Date().toISOString().split('T')[0]
    }.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = e.target?.result as string;
          const success = importConfiguration(jsonData);
          setStatus(success ? 'success' : 'error');
          setTimeout(() => setStatus('idle'), 3000);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
          setStatus('error');
          setTimeout(() => setStatus('idle'), 3000);
        }
      };
      reader.readAsText(file);
    },
    [importConfiguration]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
    },
    maxFiles: 1,
  });

  const handleClose = useCallback(() => {
    setStatus('idle');
    onClose();
  }, [setStatus, onClose]);

  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () =>
        document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleClose]);

  // Handle click outside modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      className='modal-backdrop'
      onClick={handleBackdropClick}
    >
      <div className='modal-panel max-w-lg'>
        <div className='modal-header'>
          <h2 className='modal-title'>Save or load</h2>
          <button
            onClick={handleClose}
            className='icon-btn'
            aria-label='Close'
          >
            <X size={18} />
          </button>
        </div>

        <div className='divide-y divide-line'>
          {/* Export Section */}
          <section className='p-6'>
            <h3 className='font-display text-2xl font-bold'>
              Save to a file
            </h3>
            <p className='subtle mb-4 mt-1'>
              Download your event, players and teams as a file you can
              load again later.
            </p>
            <button
              onClick={handleExport}
              disabled={teams.length === 0}
              className='btn-primary'
            >
              {exported ? (
                <>
                  <CheckCircle size={16} />
                  Downloaded
                </>
              ) : (
                <>
                  <Download size={16} />
                  Download file
                </>
              )}
            </button>
            {teams.length === 0 && (
              <p className='subtle mt-2'>Make teams first to save them.</p>
            )}
          </section>

          {/* Import Section with Dropzone */}
          <section className='p-6'>
            <h3 className='font-display text-2xl font-bold'>
              Load a file
            </h3>
            <p className='subtle mb-4 mt-1'>
              Loading replaces your current event, players and teams.
            </p>
            <div
              {...getRootProps()}
              className={clsx(
                'cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors',
                status === 'success'
                  ? 'border-ok bg-ok/10'
                  : status === 'error'
                  ? 'border-bad bg-bad/10'
                  : isDragActive
                  ? 'border-accent bg-accent/5'
                  : 'border-line hover:border-muted/60 hover:bg-sunk/50'
              )}
            >
              <input {...getInputProps()} />
              {status === 'success' ? (
                <>
                  <CheckCircle size={32} className='mx-auto text-ok' />
                  <p className='mt-2 font-semibold'>Loaded</p>
                  <p className='subtle'>Your saved setup is back.</p>
                </>
              ) : status === 'error' ? (
                <>
                  <XCircle size={32} className='mx-auto text-bad' />
                  <p className='mt-2 font-semibold'>
                    That file couldn't be loaded
                  </p>
                  <p className='subtle'>
                    Choose a .json file saved from Teamify.
                  </p>
                </>
              ) : (
                <>
                  <FileText size={32} className='mx-auto text-muted' />
                  <p className='mt-2 font-semibold'>
                    {isDragActive
                      ? 'Drop the file to load it'
                      : 'Drop a file here, or click to choose one'}
                  </p>
                  <p className='subtle'>Teamify .json files</p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
