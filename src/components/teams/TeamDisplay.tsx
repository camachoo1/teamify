import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Plus, Shuffle } from 'lucide-react';
import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';
import EmptyTeamsState from './EmptyTeamState';
import SkillLegend from './SkillLegend';
import UnassignedPlayersPool from './UnassignedPlayersPool';
import { GlobalValidationSummary } from './validations';
import DeleteTeamConfirmModal from '../../modals/DeleteTeamConfirmModal';
import { EnhancedTeamCard } from './EnhancedTeamCard';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function TeamDisplay() {
  const {
    teams,
    players,
    randomizeTeams,
    updateTeamName,
    movePlayerToTeam,
    skillBalancingEnabled,
    skillCategories,
    manualTeamMode,
    setManualMode,
    createEmptyTeam,
    removeTeam,
    assignPlayerToTeam,
    removePlayerFromTeam,
    smartRandomizeTeams,
    tournament,
    endTournament,
  } = useStore(
    useShallow((state) => ({
      teams: state.teams,
      players: state.players,
      randomizeTeams: state.randomizeTeams,
      updateTeamName: state.updateTeamName,
      movePlayerToTeam: state.movePlayerToTeam,
      skillBalancingEnabled: state.skillBalancingEnabled,
      skillCategories: state.skillCategories,
      manualTeamMode: state.manualTeamMode,
      setManualMode: state.setManualMode,
      createEmptyTeam: state.createEmptyTeam,
      removeTeam: state.removeTeam,
      assignPlayerToTeam: state.assignPlayerToTeam,
      removePlayerFromTeam: state.removePlayerFromTeam,
      smartRandomizeTeams: state.smartRandomizeTeams,
      tournament: state.tournament,
      endTournament: state.endTournament,
    }))
  );

  const [isRandomizing, setIsRandomizing] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<number | null>(
    null
  );
  const [dragOverTeam, setDragOverTeam] = useState<number | null>(
    null
  );
  const [draggedPlayerId, setDraggedPlayerId] = useState<
    number | null
  >(null);
  const [teamToDelete, setTeamToDelete] = useState<number | null>(
    null
  );
  const [showDeleteTeamModal, setShowDeleteTeamModal] =
    useState(false);
  const [confirmNewTeams, setConfirmNewTeams] = useState(false);
  // Player picked by tap/click/keyboard, waiting for a target team
  const [selectedPlayerId, setSelectedPlayerId] = useState<
    number | null
  >(null);
  const randomizeTimer = useRef<ReturnType<typeof setTimeout>>(
    undefined
  );

  useEffect(() => () => clearTimeout(randomizeTimer.current), []);

  const runWithAnimation = (action: () => void) => {
    setIsRandomizing(true);
    setSelectedPlayerId(null);
    randomizeTimer.current = setTimeout(() => {
      action();
      setIsRandomizing(false);
    }, 800);
  };

  const handleRandomize = () => {
    // New teams would no longer match the tournament in progress
    if (tournament) {
      setConfirmNewTeams(true);
      return;
    }
    runWithAnimation(randomizeTeams);
  };

  const handleSmartRandomize = () =>
    runWithAnimation(smartRandomizeTeams);

  const movePlayer = (playerId: number, teamIndex: number) => {
    if (manualTeamMode) {
      const targetTeam = teams[teamIndex];
      if (targetTeam) {
        assignPlayerToTeam(playerId, targetTeam.id);
      }
    } else {
      movePlayerToTeam(playerId, teamIndex);
    }
  };

  const handleSelectPlayer = (playerId: number) => {
    setSelectedPlayerId((current) =>
      current === playerId ? null : playerId
    );
  };

  const handlePlaceSelected = (teamIndex: number) => {
    if (selectedPlayerId !== null) {
      movePlayer(selectedPlayerId, teamIndex);
    }
    setSelectedPlayerId(null);
  };

  const handleUnassignSelected = () => {
    if (selectedPlayerId !== null) {
      removePlayerFromTeam(selectedPlayerId);
    }
    setSelectedPlayerId(null);
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    playerId: number
  ) => {
    setDraggedPlayerId(playerId);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-50', 'scale-95');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95');
    setDragOverTeam(null);
    setDraggedPlayerId(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (
    e: React.DragEvent<HTMLDivElement>,
    teamIndex: number
  ) => {
    e.preventDefault();
    setDragOverTeam(teamIndex);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTeam(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    teamIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTeam(null);

    if (draggedPlayerId !== null) {
      movePlayer(draggedPlayerId, teamIndex);
    }
    setDraggedPlayerId(null);
    setSelectedPlayerId(null);
  };

  // Handle drop on unassigned area
  const handleUnassignedDrop = (
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    if (draggedPlayerId !== null && manualTeamMode) {
      removePlayerFromTeam(draggedPlayerId);
    }
    setDraggedPlayerId(null);
    setSelectedPlayerId(null);
  };

  const handleUnassignedDragEnter = (
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    setDragOverTeam(-1);
  };

  const handleTeamNameEdit = (teamId: number, newName: string) => {
    const teamNumber = teams.findIndex((t) => t.id === teamId) + 1;
    updateTeamName(teamId, newName.trim() || `Team ${teamNumber}`);
    setEditingTeamId(null);
  };

  const handleRemoveTeam = (teamId: number) => {
    setTeamToDelete(teamId);
    setShowDeleteTeamModal(true);
  };

  const confirmRemoveTeam = () => {
    if (teamToDelete !== null) {
      removeTeam(teamToDelete);
      setTeamToDelete(null);
      setShowDeleteTeamModal(false);
    }
  };

  const activePlayers = players.filter((p) => !p.isReserve);
  const unassignedPlayers = activePlayers.filter(
    (p) => p.teamId === null
  );
  const hasUnassignedPlayers = unassignedPlayers.length > 0;
  const hasExistingTeams = teams.length > 0;
  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);
  const selectedPlayerIsAssigned =
    selectedPlayer !== undefined && selectedPlayer.teamId !== null;

  const subtitle = manualTeamMode
    ? hasExistingTeams
      ? 'Drag players between teams, or select a player and choose Move here.'
      : 'Create teams yourself, then move players into them.'
    : hasExistingTeams
    ? 'Drag players to rearrange. Locked players stay on their team when you randomize again.'
    : 'Randomize to split your players into teams.';

  return (
    <section
      aria-labelledby='teams-heading'
      className='min-w-0'
    >
      {/* Header */}
      <div className='mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
        <div>
          <h2 id='teams-heading' className='section-title text-4xl'>
            Teams
            {hasExistingTeams && (
              <span className='ml-3 align-baseline text-muted'>
                {teams.length}
              </span>
            )}
          </h2>
          <p className='subtle mt-1 max-w-prose'>{subtitle}</p>
        </div>

        <div
          className='flex flex-wrap items-center gap-2'
          data-tour='generate-teams'
        >
          <div className='segmented' role='group' aria-label='Team mode'>
            <button
              type='button'
              aria-pressed={!manualTeamMode}
              onClick={() => setManualMode(false)}
            >
              Randomize
            </button>
            <button
              type='button'
              aria-pressed={manualTeamMode}
              onClick={() => setManualMode(true)}
            >
              Manual
            </button>
          </div>

          {manualTeamMode ? (
            <>
              <button
                onClick={() => createEmptyTeam()}
                className='btn-outline'
              >
                <Plus size={16} />
                New team
              </button>
              {hasUnassignedPlayers && (
                <button
                  onClick={handleSmartRandomize}
                  className='btn-primary'
                  disabled={isRandomizing}
                  title={`Place ${unassignedPlayers.length} unassigned ${
                    unassignedPlayers.length === 1 ? 'player' : 'players'
                  } into ${
                    hasExistingTeams
                      ? 'existing teams, adding teams if needed'
                      : 'new teams'
                  }`}
                >
                  <Shuffle
                    size={16}
                    className={clsx(isRandomizing && 'animate-spin')}
                  />
                  {isRandomizing ? 'Placing players…' : 'Fill remaining'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={handleRandomize}
              className='btn-primary'
              disabled={activePlayers.length === 0 || isRandomizing}
            >
              <RefreshCw
                size={16}
                className={clsx(isRandomizing && 'animate-spin')}
              />
              {isRandomizing
                ? 'Randomizing…'
                : hasExistingTeams
                ? 'Randomize again'
                : 'Randomize teams'}
            </button>
          )}
        </div>
      </div>

      <div className='space-y-5'>
        {/* Unassigned players (Manual mode) */}
        {manualTeamMode && hasUnassignedPlayers && hasExistingTeams && (
          <p className='notice-warn'>
            <strong>
              {unassignedPlayers.length}{' '}
              {unassignedPlayers.length === 1 ? 'player needs' : 'players need'}{' '}
              a team.
            </strong>{' '}
            Fill remaining places them in the emptiest teams first and
            adds teams if needed.
          </p>
        )}

        {/* Tap-to-move hint */}
        {selectedPlayer && (
          <div className='notice-warn flex items-center justify-between gap-3'>
            <span>
              Moving <strong>{selectedPlayer.name}</strong>. Choose Move
              here on a team
              {manualTeamMode && selectedPlayerIsAssigned
                ? ', or Unassign'
                : ''}
              .
            </span>
            <button
              type='button'
              onClick={() => setSelectedPlayerId(null)}
              className='btn-ghost h-8'
            >
              Cancel
            </button>
          </div>
        )}

        <SkillLegend
          skillBalancingEnabled={skillBalancingEnabled}
          skillCategories={skillCategories}
          showLegend={teams.length > 0}
        />

        {teams.length === 0 && !manualTeamMode ? (
          <EmptyTeamsState
            skillBalancingEnabled={skillBalancingEnabled}
            activePlayerCount={activePlayers.length}
          />
        ) : (
          <>
            <GlobalValidationSummary />

            {manualTeamMode &&
              (hasUnassignedPlayers || selectedPlayerIsAssigned) && (
                <UnassignedPlayersPool
                  players={unassignedPlayers}
                  selectedPlayerId={selectedPlayerId}
                  onSelectPlayer={handleSelectPlayer}
                  onUnassignSelected={
                    selectedPlayerIsAssigned
                      ? handleUnassignSelected
                      : undefined
                  }
                  dragOverTeam={dragOverTeam}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDragEnter={handleUnassignedDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleUnassignedDrop}
                />
              )}

            {teams.length === 0 ? (
              <div className='rounded-panel border-2 border-dashed border-line px-6 py-14 text-center'>
                <p className='font-display text-4xl font-bold uppercase leading-none'>
                  No teams yet
                </p>
                <p className='mx-auto mt-3 max-w-md text-muted'>
                  {hasUnassignedPlayers
                    ? `${unassignedPlayers.length} ${
                        unassignedPlayers.length === 1
                          ? 'player is'
                          : 'players are'
                      } ready. Create teams one by one, or let Fill remaining create them for you.`
                    : 'Create your first team, then add players to it.'}
                </p>
                <button
                  onClick={() => createEmptyTeam()}
                  className='btn-outline mt-5'
                >
                  <Plus size={16} />
                  New team
                </button>
              </div>
            ) : (
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3'>
                {teams.map((team, teamIndex) => (
                  <EnhancedTeamCard
                    key={team.id}
                    team={team}
                    teamIndex={teamIndex}
                    dragOverTeam={dragOverTeam}
                    editingTeamId={editingTeamId}
                    manualTeamMode={manualTeamMode}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onTeamNameEdit={handleTeamNameEdit}
                    onRemoveTeam={handleRemoveTeam}
                    onEditTeam={setEditingTeamId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    selectedPlayerId={selectedPlayerId}
                    onSelectPlayer={handleSelectPlayer}
                    onPlaceSelected={handlePlaceSelected}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmNewTeams}
        onClose={() => setConfirmNewTeams(false)}
        onConfirm={() => {
          setConfirmNewTeams(false);
          endTournament();
          runWithAnimation(randomizeTeams);
        }}
        title='Make new teams?'
        description='A tournament is in progress with the current teams. Randomizing ends it and deletes its results.'
        confirmLabel='End it and randomize'
      />

      <DeleteTeamConfirmModal
        isOpen={showDeleteTeamModal}
        onConfirm={confirmRemoveTeam}
        onClose={() => {
          setShowDeleteTeamModal(false);
          setTeamToDelete(null);
        }}
        teamId={teamToDelete ?? 0}
      />
    </section>
  );
}
