import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import AddPlayersModal from '../../modals/AddPlayersModal';
import SkillSettingsModal from '../../modals/SkillSettingsModal';
import EditPlayerModal from '../../modals/EditPlayerModal';
import TournamentSettings from './TournamentSettings';
import FeatureToggles from './FeaturesToggle';
import SkillDistribution from './SkillDistribution';
import PlayerLists from './PlayersList';
import ClearPlayersModal from '../../modals/ClearPlayersModal';
import { Player } from '../../types';

export default function PlayerDisplay() {
  const {
    players,
    removePlayer,
    clearTeams,
  } = useStore(
    useShallow((state) => ({
      players: state.players,
      removePlayer: state.removePlayer,
      clearTeams: state.clearTeams,
    }))
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSkillSettings, setShowSkillSettings] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(
    null
  );

  const handleClearAllPlayers = () => {
    players.forEach((p) => removePlayer(p.id));
    clearTeams();
    setShowClearConfirm(false);
  };

  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingPlayer(null);
  };

  const activePlayers = players.filter((p) => !p.isReserve);
  const reservePlayers = players.filter((p) => p.isReserve);
  const lockedCount = players.filter((p) => p.locked).length;

  return (
    <>
      <section
        className='panel'
        aria-labelledby='players-heading'
      >
        <div className='mb-5 flex items-start gap-3'>
          <div className='flex-1'>
            <h2 id='players-heading' className='section-title'>
              Players
            </h2>
            <p className='subtle mt-1'>
              {players.length === 0
                ? 'Your roster is empty.'
                : `${activePlayers.length} playing${
                    reservePlayers.length > 0
                      ? `, ${reservePlayers.length} on the bench`
                      : ''
                  }${lockedCount > 0 ? `, ${lockedCount} locked` : ''}`}
            </p>
          </div>
          {players.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className='icon-btn hover:text-bad'
              title='Remove all players'
              aria-label='Remove all players'
            >
              <Trash2 size={17} />
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className='btn-primary'
            data-tour='add-players'
          >
            <Plus size={16} />
            Add players
          </button>
        </div>

        <TournamentSettings />
        <FeatureToggles
          onShowSkillSettings={() => setShowSkillSettings(true)}
        />
        <SkillDistribution />
        <PlayerLists onEditPlayer={handleEditPlayer} />
      </section>

      {/* Modals */}
      <AddPlayersModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
      <SkillSettingsModal
        isOpen={showSkillSettings}
        onClose={() => setShowSkillSettings(false)}
      />
      <EditPlayerModal
        isOpen={showEditModal}
        onClose={handleCloseEditModal}
        player={editingPlayer}
      />
      <ClearPlayersModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearAllPlayers}
        playerCount={players.length}
      />
    </>
  );
}
