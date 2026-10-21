import { useCallback, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';
import { Player } from '../types';

interface EditPlayerForm {
  playerName: string;
  skillLevel: string;
  isReserve: boolean;
}

interface EditPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export default function EditPlayerModal({
  isOpen,
  onClose,
  player,
}: EditPlayerModalProps) {
  const {
    updatePlayer,
    skillBalancingEnabled,
    skillCategories,
    reservePlayersEnabled,
    players,
    teamSize,
    maxTeams,
  } = useStore(
    useShallow((state) => ({
      updatePlayer: state.updatePlayer,
      skillBalancingEnabled: state.skillBalancingEnabled,
      skillCategories: state.skillCategories,
      reservePlayersEnabled: state.reservePlayersEnabled,
      players: state.players,
      teamSize: state.teamSize,
      maxTeams: state.maxTeams,
    }))
  );

  const { register, handleSubmit, reset, watch } =
    useForm<EditPlayerForm>({
      defaultValues: {
        playerName: '',
        skillLevel: '',
        isReserve: false,
      },
    });

  const selectedSkillLevel = watch('skillLevel');
  const isReserveChecked = watch('isReserve');

  // Calculate capacity
  const activePlayers = players.filter((p) => !p.isReserve);
  const maxActiveSlots =
    maxTeams > 0 ? maxTeams * teamSize : Infinity;
  const currentCapacity = activePlayers.length;

  // Check if promoting this specific player would exceed capacity
  const wouldExceedCapacity =
    player?.isReserve &&
    !isReserveChecked &&
    currentCapacity >= maxActiveSlots;

  useEffect(() => {
    if (isOpen && player) {
      reset({
        playerName: player.name,
        skillLevel: player.skillLevel || '',
        isReserve: player.isReserve || false,
      });
    }
  }, [isOpen, player, reset]);

  const onSubmit = (data: EditPlayerForm) => {
    if (player && data.playerName.trim()) {
      // Promotion past capacity is blocked; the form shows why
      if (wouldExceedCapacity) return;

      // Fields whose controls are hidden keep the player's current value
      updatePlayer(player.id, {
        name: data.playerName.trim(),
        skillLevel: skillBalancingEnabled
          ? data.skillLevel || undefined
          : player.skillLevel,
        isReserve: reservePlayersEnabled
          ? data.isReserve
          : player.isReserve,
      });
      onClose();
    }
  };

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

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

  if (!isOpen || !player) return null;

  return (
    <div
      role='dialog'
      aria-modal='true'
      className='modal-backdrop'
      onClick={handleBackdropClick}
    >
      <div className='modal-panel max-w-md'>
        <div className='modal-header'>
          <h2 className='modal-title'>Edit player</h2>
          <button
            onClick={handleClose}
            className='icon-btn'
            aria-label='Close'
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className='p-6 space-y-6'
        >
          {/* Player Name */}
          <div>
            <label className='field-label'>
              Player name
            </label>
            <input
              {...register('playerName', { required: true })}
              className='input-field'
              placeholder='Enter player name'
              autoFocus
            />
          </div>

          {/* Skill Category */}
          {skillBalancingEnabled && skillCategories.length > 0 && (
            <div>
              <label className='field-label'>
                Skill level
              </label>
              <div className='space-y-2'>
                {/* No Skill Level Option */}
                <label className='cursor-pointer'>
                  <input
                    {...register('skillLevel')}
                    type='radio'
                    value=''
                    className='sr-only'
                  />
                  <div
                    className={clsx(
                      'rounded-xl border-2 p-3 text-sm font-semibold transition-colors',
                      selectedSkillLevel === ''
                        ? 'border-ink bg-sunk'
                        : 'border-line bg-paper/60 hover:border-muted/60'
                    )}
                  >
                    No skill level
                  </div>
                </label>

                {/* Skill Categories */}
                <div className='grid grid-cols-1 gap-2'>
                  {skillCategories.map((category) => (
                    <label
                      key={category.id}
                      className='cursor-pointer'
                    >
                      <input
                        {...register('skillLevel')}
                        type='radio'
                        value={category.id}
                        className='sr-only'
                      />
                      <div
                        className={clsx(
                          'flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-semibold transition-colors',
                          selectedSkillLevel === category.id
                            ? 'border-transparent text-white'
                            : 'border-line bg-paper/60 hover:border-muted/60'
                        )}
                        style={
                          selectedSkillLevel === category.id
                            ? { backgroundColor: category.color }
                            : {}
                        }
                      >
                        <div
                          className='dot'
                          style={{ backgroundColor: category.color }}
                        />
                        <span>{category.name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reserve Status */}
          {reservePlayersEnabled && (
            <div>
              <label className='flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-4'>
                <span className='flex-1'>
                  <span className='block font-semibold'>On the bench</span>
                  <span className='subtle'>
                    Reserves stay out of the teams.
                  </span>
                </span>
                <input
                  {...register('isReserve')}
                  type='checkbox'
                  className='peer sr-only'
                />
                <span className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-[20px] peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface" aria-hidden='true' />
              </label>
              {wouldExceedCapacity && (
                <p className='notice-bad mt-2'>
                  Teams are full ({currentCapacity} of {maxActiveSlots}{' '}
                  spots used). Keep this player on the bench, or remove
                  someone from the playing list first.
                </p>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className='flex gap-3 pt-4'>
            <button
              type='submit'
              disabled={wouldExceedCapacity}
              className='btn-primary flex-1'
            >
              <Save size={16} />
              Save changes
            </button>
            <button
              type='button'
              onClick={handleClose}
              className='btn-ghost'
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
