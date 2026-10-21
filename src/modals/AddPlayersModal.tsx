import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';

interface PlayerForm {
  playerName: string;
  skillLevel: string;
}

interface BulkPlayerForm {
  playerList: string;
  defaultSkillLevel: string;
}

interface AddPlayersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPlayersModal({
  isOpen,
  onClose,
}: AddPlayersModalProps) {
  const {
    players,
    addPlayer,
    skillBalancingEnabled,
    skillCategories,
    reservePlayersEnabled,
  } = useStore(
    useShallow((state) => ({
      players: state.players,
      addPlayer: state.addPlayer,
      skillBalancingEnabled: state.skillBalancingEnabled,
      skillCategories: state.skillCategories,
      reservePlayersEnabled: state.reservePlayersEnabled,
    }))
  );

  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [addAsReserve, setAddAsReserve] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PlayerForm>({
      defaultValues: { skillLevel: skillCategories[0]?.id || '' },
    });

  const {
    register: registerBulk,
    handleSubmit: handleSubmitBulk,
    reset: resetBulk,
    formState: { errors: bulkErrors },
  } = useForm<BulkPlayerForm>({
    defaultValues: {
      defaultSkillLevel: skillCategories[0]?.id || '',
    },
  });

  const selectedSkillLevel = watch('skillLevel');

  // The form's default category can be deleted while the modal is mounted
  const isKnownCategory = (categoryId: string) =>
    skillCategories.some((category) => category.id === categoryId);

  const onSubmit = (data: PlayerForm) => {
    if (data.playerName.trim()) {
      if (skillBalancingEnabled && isKnownCategory(data.skillLevel)) {
        addPlayer(
          data.playerName.trim(),
          data.skillLevel,
          addAsReserve
        );
      } else {
        addPlayer(data.playerName.trim(), undefined, addAsReserve);
      }
      reset({ playerName: '', skillLevel: data.skillLevel });
      onClose();
    }
  };

  const onBulkSubmit = (data: BulkPlayerForm) => {
    const playerNames = data.playerList
      .split('\n')
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (playerNames.length > 0) {
      // Track names already added, including earlier lines of this list
      const existingNames = new Set(
        players.map((player) => player.name.toLowerCase())
      );
      playerNames.forEach((name) => {
        if (!existingNames.has(name.toLowerCase())) {
          existingNames.add(name.toLowerCase());
          if (
            skillBalancingEnabled &&
            isKnownCategory(data.defaultSkillLevel)
          ) {
            addPlayer(name, data.defaultSkillLevel, addAsReserve);
          } else {
            addPlayer(name, undefined, addAsReserve);
          }
        }
      });
      resetBulk();
      onClose();
    }
  };

  const handleClose = useCallback(() => {
    reset();
    resetBulk();
    setAddAsReserve(false);
    onClose();
  }, [reset, resetBulk, onClose]);

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
          <h2 className='modal-title'>Add players</h2>
          <button
            onClick={handleClose}
            className='icon-btn'
            aria-label='Close'
          >
            <X size={18} />
          </button>
        </div>

        <div className='p-6'>
          {/* Mode Toggle */}
          <div className='segmented mb-6' role='group' aria-label='How to add'>
            <button
              type='button'
              aria-pressed={addMode === 'single'}
              onClick={() => setAddMode('single')}
            >
              One player
            </button>
            <button
              type='button'
              aria-pressed={addMode === 'bulk'}
              onClick={() => setAddMode('bulk')}
            >
              Paste a list
            </button>
          </div>

          {/* Reserve Player Toggle */}
          {reservePlayersEnabled && (
            <label className='mb-6 flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-4'>
              <span className='flex-1'>
                <span className='block font-semibold'>
                  Add to the bench
                </span>
                <span className='subtle'>
                  Reserves stay out of the teams until you move them in.
                </span>
              </span>
              <input
                type='checkbox'
                checked={addAsReserve}
                onChange={(e) => setAddAsReserve(e.target.checked)}
                className='peer sr-only'
              />
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-surface after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-accent peer-checked:after:translate-x-[20px] peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface" aria-hidden='true' />
            </label>
          )}

          {addMode === 'single' ? (
            <form
              onSubmit={handleSubmit(onSubmit)}
              className='space-y-4'
            >
              <div>
                <label className='field-label'>
                  Player name
                </label>
                <input
                  {...register('playerName', {
                    required: 'Please enter a player name',
                    validate: (value) => {
                      const name = value.trim().toLowerCase();
                      if (!name) return 'Please enter a player name';
                      return (
                        !players.some(
                          (player) => player.name.toLowerCase() === name
                        ) || 'A player with this name already exists'
                      );
                    },
                  })}
                  className='input-field'
                  placeholder='Full name or nickname'
                  autoFocus
                />
                {errors.playerName && (
                  <p className='mt-1 text-sm text-bad'>
                    {errors.playerName.message}
                  </p>
                )}
              </div>

              {skillBalancingEnabled &&
                skillCategories.length > 0 && (
                  <div>
                    <label className='field-label'>
                      Skill level
                    </label>
                    <div className='grid grid-cols-2 gap-2'>
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
                              style={{
                                backgroundColor: category.color,
                              }}
                            />
                            <span>{category.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

              <div className='flex gap-3 pt-4'>
                <button
                  type='submit'
                  className='btn-primary flex-1'
                >
                  <Plus size={16} />
                  Add player
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
          ) : (
            <form
              onSubmit={handleSubmitBulk(onBulkSubmit)}
              className='space-y-4'
            >
              <div>
                <label className='field-label'>
                  Player names
                </label>
                <textarea
                  {...registerBulk('playerList', {
                    required: 'Please enter at least one player name',
                    validate: (value) => {
                      const names = value
                        .split('\n')
                        .filter((name) => name.trim().length > 0);
                      return (
                        names.length > 0 ||
                        'Please enter at least one player name'
                      );
                    },
                  })}
                  className='input-field min-h-[150px] resize-y'
                  placeholder='Enter player names (one per line)&#10;John Doe&#10;Jane Smith&#10;Mike Johnson'
                  autoFocus
                />
                {bulkErrors.playerList && (
                  <p className='mt-1 text-sm text-bad'>
                    {bulkErrors.playerList.message}
                  </p>
                )}
                <p className='mt-2 text-sm text-muted'>
                  Enter one player name per line. Duplicate names will
                  be skipped.
                </p>
              </div>

              {skillBalancingEnabled &&
                skillCategories.length > 0 && (
                  <div>
                    <label className='field-label'>
                      Skill level for everyone
                    </label>
                    <select
                      {...registerBulk('defaultSkillLevel')}
                      className='input-field'
                    >
                      {skillCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <p className='mt-2 text-sm text-muted'>
                      All players will be assigned this skill
                      category.
                    </p>
                  </div>
                )}

              <div className='flex gap-3 pt-4'>
                <button
                  type='submit'
                  className='btn-primary flex-1'
                >
                  <Plus size={16} />
                  Add players
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
          )}
        </div>
      </div>
    </div>
  );
}
