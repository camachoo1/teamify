import { ChevronDown, Download, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { getTeamColor } from '../utils/teamColors';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useState } from 'react';

export default function History() {
  const {
    history,
    loadHistoryEntry,
    clearHistory,
  } = useStore(
    useShallow((state) => ({
      history: state.history,
      loadHistoryEntry: state.loadHistoryEntry,
      clearHistory: state.clearHistory,
    }))
  );
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  };

  const handleClearHistory = () => {
    clearHistory();
    setShowClearConfirm(false);
  };

  return (
    <section aria-labelledby='history-heading'>
      <div className='mb-4 flex items-end justify-between gap-4'>
        <div>
          <h2 id='history-heading' className='section-title'>
            History
          </h2>
          <p className='subtle mt-1'>
            Your last 10 sets of teams. Load one to go back to it.
          </p>
        </div>
        {history.length > 0 && !showClearConfirm && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className='icon-btn hover:text-bad'
            title='Clear history'
            aria-label='Clear history'
          >
            <Trash2 size={17} />
          </button>
        )}
      </div>

      {showClearConfirm && (
        <div className='notice-bad mb-4'>
          <p className='font-semibold'>Clear all history?</p>
          <p className='mt-0.5 text-muted'>
            This deletes all {history.length} saved sets of teams. It
            can't be undone.
          </p>
          <div className='mt-3 flex gap-2'>
            <button onClick={handleClearHistory} className='btn-danger h-9'>
              Clear history
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className='btn-ghost h-9'
            >
              Keep it
            </button>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className='rounded-panel border-2 border-dashed border-line px-6 py-8 text-center text-muted'>
          Nothing here yet. Each time you make teams, a copy is saved
          here.
        </p>
      ) : (
        <ul className='divide-y divide-line border-y border-line'>
          {history.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <li key={entry.id}>
                <button
                  type='button'
                  className='flex w-full items-center gap-3 py-3 text-left'
                  onClick={() =>
                    setExpandedId(isExpanded ? null : entry.id)
                  }
                  aria-expanded={isExpanded}
                >
                  <div className='min-w-0 flex-1'>
                    <p className='truncate font-semibold'>
                      {entry.eventName || 'Untitled event'}
                    </p>
                    <p className='text-sm text-muted'>
                      {formatDate(entry.timestamp)}, {entry.teams.length}{' '}
                      {entry.teams.length === 1 ? 'team' : 'teams'}
                      {entry.organizerName &&
                        `, by ${entry.organizerName}`}
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={clsx(
                      'shrink-0 text-muted transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>

                {isExpanded && (
                  <div className='pb-4'>
                    <div className='mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2'>
                      {entry.teams.map((team, teamIdx) => (
                        <div
                          key={teamIdx}
                          className='rounded-xl bg-surface p-3'
                          style={{
                            borderLeft: `4px solid ${getTeamColor(teamIdx)}`,
                          }}
                        >
                          <p className='mb-1 font-semibold'>{team.name}</p>
                          <p className='text-sm text-muted'>
                            {team.players.length === 0
                              ? 'No players'
                              : team.players
                                  .map((player) => player.name)
                                  .join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => loadHistoryEntry(entry.id)}
                      className='btn-secondary h-9'
                    >
                      <Download size={15} />
                      Load these teams
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
