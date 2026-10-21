import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Edit3, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import clsx from 'clsx';

interface SkillCategoryForm {
  categoryName: string;
  categoryColor: string;
}

interface SkillSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultColors = [
  '#8B5CF6',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#6366F1',
  '#84CC16',
  '#F97316',
  '#6B7280',
];

export default function SkillSettingsModal({
  isOpen,
  onClose,
}: SkillSettingsModalProps) {
  const {
    skillCategories,
    addSkillCategory,
    removeSkillCategory,
    updateSkillCategory,
    teamCompositionRules,
    updateTeamCompositionRules,
    teamSize,
    teamNamingCategoryId,
    updateTeamNamingCategory,
  } = useStore(
    useShallow((state) => ({
      skillCategories: state.skillCategories,
      addSkillCategory: state.addSkillCategory,
      removeSkillCategory: state.removeSkillCategory,
      updateSkillCategory: state.updateSkillCategory,
      teamCompositionRules: state.teamCompositionRules,
      updateTeamCompositionRules: state.updateTeamCompositionRules,
      teamSize: state.teamSize,
      teamNamingCategoryId: state.teamNamingCategoryId,
      updateTeamNamingCategory: state.updateTeamNamingCategory,
    }))
  );

  const [editingCategoryId, setEditingCategoryId] = useState<
    string | null
  >(null);

  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    reset: resetCategory,
    formState: { errors: categoryErrors },
  } = useForm<SkillCategoryForm>();

  const onCategorySubmit = (data: SkillCategoryForm) => {
    if (data.categoryName.trim()) {
      addSkillCategory(data.categoryName.trim(), data.categoryColor);
      resetCategory();
    }
  };

  const handleEditCategory = (
    categoryId: string,
    newName: string
  ) => {
    if (newName.trim()) {
      updateSkillCategory(categoryId, newName.trim());
    }
    setEditingCategoryId(null);
  };

  const handleCompositionRuleChange = (
    categoryId: string,
    count: number
  ) => {
    const newRules = { ...teamCompositionRules };
    if (count <= 0) {
      delete newRules[categoryId];
    } else {
      newRules[categoryId] = Math.max(0, Math.min(count, teamSize));
    }
    updateTeamCompositionRules(newRules);
  };

  const getRandomColor = () => {
    const usedColors = skillCategories.map((cat) => cat.color);
    const availableColors = defaultColors.filter(
      (color) => !usedColors.includes(color)
    );
    return availableColors.length > 0
      ? availableColors[
          Math.floor(Math.random() * availableColors.length)
        ]
      : defaultColors[
          Math.floor(Math.random() * defaultColors.length)
        ];
  };

  const getTotalRuleCount = () => {
    return Object.values(teamCompositionRules).reduce(
      (sum, count) => sum + count,
      0
    );
  };

  const isValidComposition = () => {
    const totalRuleCount = getTotalRuleCount();
    return totalRuleCount <= teamSize;
  };

  const handleClose = useCallback(() => {
    setEditingCategoryId(null);
    resetCategory();
    onClose();
  }, [setEditingCategoryId, resetCategory, onClose]);

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
      <div className='modal-panel max-w-3xl'>
        <div className='modal-header'>
          <h2 className='modal-title'>Skill balancing</h2>
          <button
            onClick={handleClose}
            className='icon-btn'
            aria-label='Close'
          >
            <X size={18} />
          </button>
        </div>

        <div className='space-y-8 p-6'>
          {/* Manage Categories */}
          <section aria-labelledby='skill-levels-heading'>
            <h3
              id='skill-levels-heading'
              className='mb-1 font-display text-2xl font-bold'
            >
              Skill levels
            </h3>
            <p className='subtle mb-4'>
              Name the levels you use and pick a color for each.
            </p>

            <ul className='mb-4 divide-y divide-line rounded-2xl border border-line'>
              {skillCategories.map((category) => (
                <li
                  key={category.id}
                  className='flex items-center gap-3 px-4 py-2.5'
                >
                  <span
                    className='dot h-4 w-4'
                    style={{ backgroundColor: category.color }}
                  />
                  {editingCategoryId === category.id ? (
                    <div className='flex flex-1 gap-2'>
                      <input
                        defaultValue={category.name}
                        aria-label='Skill level name'
                        className='input-field h-9 flex-1'
                        autoFocus
                        onBlur={(e) =>
                          handleEditCategory(
                            category.id,
                            e.target.value
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditCategory(
                              category.id,
                              e.currentTarget.value
                            );
                          } else if (e.key === 'Escape') {
                            // Cancel the rename without closing the modal
                            e.stopPropagation();
                            setEditingCategoryId(null);
                          }
                        }}
                      />
                      <button
                        onClick={() => setEditingCategoryId(null)}
                        className='icon-btn text-ok'
                        title='Save name'
                        aria-label='Save name'
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className='flex-1 font-semibold'>
                        {category.name}
                      </span>
                      <button
                        onClick={() =>
                          setEditingCategoryId(category.id)
                        }
                        className='icon-btn h-8 w-8'
                        title='Rename'
                        aria-label={`Rename ${category.name}`}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() =>
                          removeSkillCategory(category.id)
                        }
                        className='icon-btn h-8 w-8 hover:text-bad'
                        disabled={skillCategories.length <= 1}
                        title={
                          skillCategories.length <= 1
                            ? 'Keep at least one skill level'
                            : 'Delete'
                        }
                        aria-label={`Delete ${category.name}`}
                      >
                        <X size={15} />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>

            <form
              onSubmit={handleSubmitCategory(onCategorySubmit)}
              className='flex gap-2'
            >
              <input
                {...registerCategory('categoryColor')}
                type='color'
                defaultValue={getRandomColor()}
                className='h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-line bg-paper p-1'
                title='Color'
                aria-label='Color for the new skill level'
              />
              <input
                {...registerCategory('categoryName', {
                  required: 'Give the skill level a name',
                  validate: (value) => {
                    const exists = skillCategories.some(
                      (cat) =>
                        cat.name.toLowerCase() ===
                        value.trim().toLowerCase()
                    );
                    return !exists || 'That skill level already exists';
                  },
                })}
                className='input-field flex-1'
                placeholder='New skill level, like Beginner'
                aria-label='New skill level name'
              />
              <button type='submit' className='btn-outline h-11'>
                <Plus size={16} />
                Add
              </button>
            </form>
            {categoryErrors.categoryName && (
              <p className='mt-1 text-sm text-bad'>
                {categoryErrors.categoryName.message}
              </p>
            )}
          </section>

          {/* Team Composition Rules */}
          <section aria-labelledby='team-rules-heading'>
            <h3
              id='team-rules-heading'
              className='mb-1 font-display text-2xl font-bold'
            >
              Team rules
            </h3>
            <p className='subtle mb-4 max-w-prose'>
              Set how many players of each level every team needs. Leave
              a level at 0 for no rule; open spots are filled with
              anyone. For example, 1 expert and 3 of anyone makes teams
              of 4.
            </p>

            <ul className='divide-y divide-line rounded-2xl border border-line'>
              {skillCategories.map((category) => (
                <li
                  key={category.id}
                  className='flex items-center gap-3 px-4 py-2.5'
                >
                  <span
                    className='dot h-4 w-4'
                    style={{ backgroundColor: category.color }}
                  />
                  <label
                    htmlFor={`rule-${category.id}`}
                    className='flex-1 font-semibold'
                  >
                    {category.name}
                  </label>
                  <input
                    id={`rule-${category.id}`}
                    type='number'
                    min='0'
                    max={teamSize}
                    value={teamCompositionRules[category.id] || 0}
                    onChange={(e) =>
                      handleCompositionRuleChange(
                        category.id,
                        parseInt(e.target.value) || 0
                      )
                    }
                    className='input-field h-9 w-20 px-2 text-center'
                  />
                  <span className='w-16 text-sm text-muted'>per team</span>
                </li>
              ))}
            </ul>

            <div
              className={clsx(
                'mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-2xl px-4 py-3',
                isValidComposition() ? 'bg-sunk' : 'notice-bad'
              )}
            >
              <span>
                {isValidComposition()
                  ? `${Math.max(
                      0,
                      teamSize - getTotalRuleCount()
                    )} open ${
                      teamSize - getTotalRuleCount() === 1
                        ? 'spot'
                        : 'spots'
                    } per team for anyone.`
                  : `The rules add up to more than the team size of ${teamSize}. Lower a rule or raise the team size.`}
              </span>
              <span className='font-display text-2xl font-bold leading-none'>
                {getTotalRuleCount()} of {teamSize}
              </span>
            </div>
          </section>

          {/* Team Naming Options */}
          <section aria-labelledby='team-names-heading'>
            <h3
              id='team-names-heading'
              className='mb-3 font-display text-2xl font-bold'
            >
              Team names
            </h3>

            <div className='space-y-2'>
              <label className='flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4'>
                <input
                  type='radio'
                  name='teamNaming'
                  checked={!teamNamingCategoryId}
                  onChange={() => updateTeamNamingCategory(null)}
                  className='mt-1 h-4 w-4 accent-[rgb(var(--accent))]'
                />
                <span>
                  <span className='block font-semibold'>Numbered</span>
                  <span className='subtle'>Team 1, Team 2, and so on.</span>
                </span>
              </label>

              <div className='rounded-2xl border border-line p-4'>
                <label className='flex cursor-pointer items-start gap-3'>
                  <input
                    type='radio'
                    name='teamNaming'
                    checked={!!teamNamingCategoryId}
                    onChange={() => {
                      if (
                        !teamNamingCategoryId &&
                        skillCategories.length > 0
                      ) {
                        updateTeamNamingCategory(
                          skillCategories[0].id
                        );
                      }
                    }}
                    className='mt-1 h-4 w-4 accent-[rgb(var(--accent))]'
                  />
                  <span>
                    <span className='block font-semibold'>
                      Named after a player
                    </span>
                    <span className='subtle'>
                      Each team takes the name of its first player from
                      the level you choose, like Team Maya.
                    </span>
                  </span>
                </label>

                {teamNamingCategoryId && (
                  <fieldset className='ml-7 mt-3'>
                    <legend className='subtle mb-2'>
                      Use players from
                    </legend>
                    <div className='flex flex-wrap gap-2'>
                      {skillCategories.map((category) => (
                        <label
                          key={category.id}
                          className={clsx(
                            'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
                            teamNamingCategoryId === category.id
                              ? 'border-ink bg-ink text-paper'
                              : 'border-line hover:bg-sunk'
                          )}
                        >
                          <input
                            type='radio'
                            name='namingCategory'
                            checked={
                              teamNamingCategoryId === category.id
                            }
                            onChange={() =>
                              updateTeamNamingCategory(category.id)
                            }
                            className='sr-only'
                          />
                          <span
                            className='dot'
                            style={{
                              backgroundColor: category.color,
                            }}
                          />
                          {category.name}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            </div>
          </section>

          {/* Actions */}
          <div className='flex justify-end border-t border-line pt-5'>
            <button onClick={handleClose} className='btn-secondary'>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
