import React, { useState, useEffect, useCallback } from 'react';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { CheckCircle, Copy, ExternalLink, X } from 'lucide-react';

interface ChallongeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChallongeExportModal({
  isOpen,
  onClose,
}: ChallongeExportModalProps) {
  const {
    teams,
    eventName,
  } = useStore(
    useShallow((state) => ({
      teams: state.teams,
      eventName: state.eventName,
    }))
  );
  const [copied, setCopied] = useState(false);
  const [includePlayerNames, setIncludePlayerNames] = useState(false);

  const generateTeamList = () => {
    if (includePlayerNames) {
      // Format: "Team Name (Player1, Player2, Player3)"
      return teams
        .map(
          (team) =>
            `${team.name} (${team.players
              .map((p) => p.name)
              .join(', ')})`
        )
        .join('\n');
    } else {
      // Format: Just team names
      return teams.map((team) => team.name).join('\n');
    }
  };

  const teamList = generateTeamList();

  const handleCopy = async () => {
    const teamList = generateTeamList();
    try {
      await navigator.clipboard.writeText(teamList);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = teamList;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleClose = useCallback(() => {
    setCopied(false);
    onClose();
  }, [setCopied, onClose]);

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
      <div className='modal-panel max-w-2xl'>
        <div className='modal-header'>
          <h2 className='modal-title'>Export for Challonge</h2>
          <button
            onClick={handleClose}
            className='icon-btn'
            aria-label='Close'
          >
            <X size={18} />
          </button>
        </div>

        <div className='p-6'>
          {teams.length === 0 ? (
            <div className='py-10 text-center'>
              <p className='font-display text-3xl font-bold uppercase'>
                No teams yet
              </p>
              <p className='mx-auto mb-6 mt-2 max-w-sm text-muted'>
                Make your teams first, then come back here to copy them
                into Challonge.
              </p>
              <button onClick={handleClose} className='btn-secondary'>
                Back to teams
              </button>
            </div>
          ) : (
            <div className='space-y-6'>
              <ol className='list-inside list-decimal space-y-1 text-muted marker:font-semibold marker:text-ink'>
                <li>Copy the team list below.</li>
                <li>In your Challonge tournament, open Participants.</li>
                <li>Choose Bulk Add and paste the list.</li>
              </ol>

              <label className='flex cursor-pointer items-center gap-3'>
                <input
                  type='checkbox'
                  checked={includePlayerNames}
                  onChange={(e) =>
                    setIncludePlayerNames(e.target.checked)
                  }
                  className='h-4 w-4 accent-[rgb(var(--accent))]'
                />
                <span>
                  <span className='font-semibold'>
                    Include player names
                  </span>
                  <span className='subtle block'>
                    Lists each team's players in brackets after its name.
                  </span>
                </span>
              </label>

              <div>
                <div className='mb-2 flex items-baseline justify-between'>
                  <h3 className='font-semibold'>
                    {teams.length} {teams.length === 1 ? 'team' : 'teams'},{' '}
                    {teams.reduce(
                      (total, team) => total + team.players.length,
                      0
                    )}{' '}
                    players
                  </h3>
                  {eventName && (
                    <span className='subtle truncate'>
                      Tournament name: {eventName}
                    </span>
                  )}
                </div>
                <pre className='scrollbar-custom max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-line bg-paper/70 p-4 text-sm'>
                  {teamList}
                </pre>
              </div>

              <div className='flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5'>
                <a
                  href='https://challonge.com/tournaments/new'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='btn-ghost -ml-3'
                >
                  New Challonge tournament
                  <ExternalLink size={14} />
                </a>
                <button onClick={handleCopy} className='btn-primary'>
                  {copied ? (
                    <>
                      <CheckCircle size={16} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy list
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
