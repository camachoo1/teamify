import clsx from 'clsx';
import { SkillCategory } from '../../../types';

interface TeamCompositionWarningProps {
  violations: string[];
  skillDistribution: {
    [categoryId: string]: {
      actual: number;
      required: number;
      categoryName: string;
    };
  };
  skillCategories: SkillCategory[];
}

export const TeamCompositionWarning = ({
  violations,
  skillDistribution,
  skillCategories,
}: TeamCompositionWarningProps) => {
  if (violations.length === 0) return null;

  return (
    <div className='notice-bad mb-4 px-3 py-2.5'>
      <p className='mb-2 font-semibold text-bad'>
        Doesn't match the team rules
      </p>
      <ul className='space-y-1'>
        {Object.entries(skillDistribution).map(([categoryId, info]) => {
          const category = skillCategories.find(
            (c) => c.id === categoryId
          );
          const difference = info.actual - info.required;

          return (
            <li
              key={categoryId}
              className='flex items-center justify-between gap-2 text-xs'
            >
              <span className='flex items-center gap-1.5'>
                <span
                  className='dot h-2 w-2'
                  style={{ backgroundColor: category?.color || '#888' }}
                />
                {info.categoryName}
              </span>
              <span
                className={clsx(
                  'font-semibold tabular-nums',
                  difference === 0 ? 'text-ok' : 'text-bad'
                )}
              >
                {info.actual} of {info.required}
                {difference > 0 && ` (${difference} too many)`}
                {difference < 0 && ` (${-difference} short)`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
