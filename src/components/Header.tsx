import { useState } from 'react';
import {
  Moon,
  Sun,
  Trophy,
  FileDown,
  Share2,
  Trash2,
} from 'lucide-react';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import ImportExportModal from '../modals/ImportExportModal';
import ChallongeExportModal from '../modals/BulkExportModal';
import ShareModal from '../modals/ShareModal';
import ClearAllModal from '../modals/ClearAllModal';

export default function Header() {
  const {
    darkMode,
    toggleDarkMode,
    eventName,
    organizerName,
    teams,
    players,
    clearAll,
    activeView,
    setActiveView,
    tournament,
  } = useStore(
    useShallow((state) => ({
      darkMode: state.darkMode,
      toggleDarkMode: state.toggleDarkMode,
      eventName: state.eventName,
      organizerName: state.organizerName,
      teams: state.teams,
      players: state.players,
      clearAll: state.clearAll,
      activeView: state.activeView,
      setActiveView: state.setActiveView,
      tournament: state.tournament,
    }))
  );
  const [showImportExport, setShowImportExport] = useState(false);
  const [showChallongeExport, setShowChallongeExport] =
    useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => {
    clearAll();
    setShowClearConfirm(false);
  };

  const hasDataToClear =
    tournament !== null ||
    teams.length > 0 ||
    players.length > 0 ||
    eventName ||
    organizerName;

  return (
    <>
      <header className='sticky top-0 z-40 border-b border-line bg-paper/95'>
        <div className='mx-auto flex min-h-16 max-w-[1400px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-8'>
          <div className='flex items-center gap-4'>
            <a
              href='#'
              className='font-display text-3xl font-black uppercase leading-none tracking-tight'
              aria-label='Teamify home'
            >
              Teamify
            </a>
            <nav
              className='segmented'
              aria-label='Sections'
            >
              <button
                type='button'
                aria-pressed={activeView === 'teams'}
                onClick={() => setActiveView('teams')}
              >
                Teams
              </button>
              <button
                type='button'
                aria-pressed={activeView === 'tournament'}
                onClick={() => setActiveView('tournament')}
              >
                Tournament
                {tournament && (
                  <span
                    className='ml-1.5 inline-block h-2 w-2 rounded-full bg-accent align-middle'
                    title='Tournament in progress'
                  />
                )}
              </button>
            </nav>
          </div>

          <div className='flex items-center gap-1 sm:gap-2'>
            <div
              className='flex items-center gap-1 sm:gap-2'
              data-tour='export-share'
            >
              <button
                onClick={() => setShowImportExport(true)}
                className='btn-ghost px-2.5 sm:px-4'
                title='Save this setup to a file or load one'
                aria-label='Save or load setup'
              >
                <FileDown size={17} />
                <span className='hidden md:inline'>Save or load</span>
              </button>
              <button
                onClick={() => setShowChallongeExport(true)}
                disabled={teams.length === 0}
                className='btn-ghost px-2.5 sm:px-4'
                title={
                  teams.length === 0
                    ? 'Create teams first'
                    : 'Copy a team list for Challonge'
                }
                aria-label='Export for Challonge'
              >
                <Trophy size={17} />
                <span className='hidden md:inline'>Challonge</span>
              </button>
              <button
                onClick={() => setShowShare(true)}
                disabled={teams.length === 0}
                className='btn-primary px-3 sm:px-4'
                title={
                  teams.length === 0
                    ? 'Create teams first'
                    : 'Share a read-only link'
                }
                aria-label='Share teams'
              >
                <Share2 size={17} />
                <span className='hidden sm:inline'>Share</span>
              </button>
            </div>

            <span className='mx-1 hidden h-6 w-px bg-line sm:block' />

            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={!hasDataToClear}
              className='icon-btn hover:text-bad'
              title={
                hasDataToClear ? 'Clear everything' : 'Nothing to clear'
              }
              aria-label='Clear everything'
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={toggleDarkMode}
              className='icon-btn'
              title={darkMode ? 'Use light theme' : 'Use dark theme'}
              aria-label={darkMode ? 'Use light theme' : 'Use dark theme'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Modals */}
      <ImportExportModal
        isOpen={showImportExport}
        onClose={() => setShowImportExport(false)}
      />
      <ChallongeExportModal
        isOpen={showChallongeExport}
        onClose={() => setShowChallongeExport(false)}
      />
      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
      />

      <ClearAllModal
        isOpen={showClearConfirm}
        onConfirm={handleClearAll}
        onClose={() => setShowClearConfirm(false)}
      />
    </>
  );
}
