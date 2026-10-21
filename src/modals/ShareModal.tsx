import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Copy,
  CheckCircle,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { encodeShareData } from '../utils/share';

interface SavedBracket {
  id: string;
  title: string;
  embedUrl: string;
}

const readSavedBrackets = (): SavedBracket[] => {
  try {
    const saved = JSON.parse(localStorage.getItem('saved-brackets') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const shortenUrl = async (longUrl: string): Promise<string> => {
  const response = await fetch(
    `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`
  );

  if (!response.ok) {
    throw new Error('Failed to shorten URL');
  }

  const shortUrl = await response.text();

  // Validate that we got a proper TinyURL back
  if (!shortUrl.startsWith('https://tinyurl.com/')) {
    throw new Error('Invalid response from TinyURL');
  }
  return shortUrl;
};

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({
  isOpen,
  onClose,
}: ShareModalProps) {
  const {
    teams,
    players,
    eventName,
    organizerName,
    skillCategories,
    skillBalancingEnabled,
  } = useStore(
    useShallow((state) => ({
      teams: state.teams,
      players: state.players,
      eventName: state.eventName,
      organizerName: state.organizerName,
      skillCategories: state.skillCategories,
      skillBalancingEnabled: state.skillBalancingEnabled,
    }))
  );
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [isShortening, setIsShortening] = useState(false);
  const [shorteningError, setShorteningError] = useState('');

  const generateShareUrl = useCallback(() => {
    const brackets = readSavedBrackets();
    const reservePlayers = players.filter((p) => p.isReserve);

    const shareData = {
      e: eventName,
      o: organizerName,
      t: teams.map((team) => ({
        n: team.name,
        p: team.players.map((player) => ({
          n: player.name,
          ...(player.skillLevel && { s: player.skillLevel }),
        })),
      })),
      // Include reserve players if any exist
      ...(reservePlayers.length > 0 && {
        r: reservePlayers.map((player) => ({
          n: player.name,
          ...(player.skillLevel && { s: player.skillLevel }),
        })),
      }),
      ...(skillBalancingEnabled &&
        skillCategories.length > 0 && {
          sc: skillCategories.map((cat) => ({
            i: cat.id,
            n: cat.name,
            c: cat.color,
          })),
          sb: true,
        }),
      ...(brackets.length > 0 && {
        b: brackets.map((bracket) => ({
          i: bracket.id,
          t: bracket.title,
          u: bracket.embedUrl,
        })),
      }),
      ts: Date.now(),
    };

    // Encode the data (UTF-8 safe)
    const encoded = encodeShareData(shareData);
    return `${window.location.origin}${window.location.pathname}#share=${encoded}`;
  }, [
    eventName,
    organizerName,
    teams,
    players,
    skillBalancingEnabled,
    skillCategories,
  ]);

  useEffect(() => {
    if (!isOpen || teams.length === 0) return;

    // Ignore results from an earlier request if the data changed
    // or the modal closed while it was in flight
    let cancelled = false;

    const fullUrl = generateShareUrl();
    setShareUrl(fullUrl);
    setShortUrl('');
    setShorteningError('');
    setIsShortening(true);

    // Automatically try to shorten the URL
    shortenUrl(fullUrl)
      .then((url) => {
        if (!cancelled) setShortUrl(url);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('URL shortening failed:', error);
        setShorteningError(
          'Failed to create short URL. You can still use the full link below.'
        );
      })
      .finally(() => {
        if (!cancelled) setIsShortening(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, generateShareUrl, teams.length]);

  const handleCopy = async (urlToCopy: string) => {
    try {
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = urlToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenPreview = () => {
    window.open(shareUrl, '_blank');
  };

  const handleClose = useCallback(() => {
    setCopied(false);
    setShortUrl('');
    setShorteningError('');
    onClose();
  }, [onClose]);

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

  const activePlayers = players.filter((p) => !p.isReserve);
  const reservePlayers = players.filter((p) => p.isReserve);
  const totalPlayers = activePlayers.length + reservePlayers.length;

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
          <h2 className='modal-title'>Share teams</h2>
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
                Make your teams first, then share a link to them.
              </p>
              <button onClick={handleClose} className='btn-secondary'>
                Back to teams
              </button>
            </div>
          ) : (
            <div className='space-y-6'>
              <p className='text-muted'>
                Anyone with the link can see the teams, skill levels and
                reserves, but can't change them. No account needed.
              </p>

              {/* Link */}
              <div>
                <p className='field-label'>
                  {shortUrl ? 'Short link' : 'Link'}
                </p>
                <div className='flex items-center gap-2 rounded-2xl border border-line bg-paper/70 p-2 pl-4'>
                  {isShortening ? (
                    <span className='flex flex-1 items-center gap-2 text-sm text-muted'>
                      <Loader2 size={16} className='animate-spin' />
                      Making a short link…
                    </span>
                  ) : (
                    <span className='min-w-0 flex-1 truncate text-sm'>
                      {shortUrl || shareUrl}
                    </span>
                  )}
                  <button
                    onClick={() => handleCopy(shortUrl || shareUrl)}
                    className='btn-primary h-9 shrink-0'
                    disabled={!shareUrl}
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={15} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={15} />
                        Copy link
                      </>
                    )}
                  </button>
                </div>
                {shortUrl && (
                  <p className='subtle mt-1.5'>Shortened with TinyURL.</p>
                )}
                {shorteningError && (
                  <p className='notice-warn mt-2'>{shorteningError}</p>
                )}
              </div>

              {/* Share Preview */}
              <div>
                <p className='field-label'>What people will see</p>
                <dl className='grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4'>
                  {[
                    ['Event', eventName || 'Untitled event'],
                    ['Organizer', organizerName || 'Not set'],
                    ['Teams', String(teams.length)],
                    [
                      'Players',
                      reservePlayers.length > 0
                        ? `${activePlayers.length} + ${reservePlayers.length} reserves`
                        : String(totalPlayers),
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className='bg-surface px-4 py-3'>
                      <dt className='subtle'>{label}</dt>
                      <dd className='truncate font-semibold'>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className='flex justify-end border-t border-line pt-5'>
                <button onClick={handleOpenPreview} className='btn-outline'>
                  <ExternalLink size={16} />
                  Open the shared page
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
