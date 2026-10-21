import { SkillCategory } from '../../types';

interface SkillLegendProps {
  skillBalancingEnabled: boolean;
  skillCategories: SkillCategory[];
  showLegend: boolean;
}

export default function SkillLegend({
  skillBalancingEnabled,
  skillCategories,
  showLegend,
}: SkillLegendProps) {
  if (
    !skillBalancingEnabled ||
    skillCategories.length === 0 ||
    !showLegend
  ) {
    return null;
  }

  return (
    <ul
      className='flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted'
      aria-label='Skill levels'
    >
      {skillCategories.map((category) => (
        <li key={category.id} className='flex items-center gap-1.5'>
          <span
            className='dot'
            style={{ backgroundColor: category.color }}
          />
          {category.name}
        </li>
      ))}
    </ul>
  );
}
