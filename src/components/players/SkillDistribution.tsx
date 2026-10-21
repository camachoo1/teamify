import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';

export default function SkillDistribution() {
  const {
    players,
    skillBalancingEnabled,
    skillCategories,
    teamCompositionRules,
  } = useStore(
    useShallow((state) => ({
      players: state.players,
      skillBalancingEnabled: state.skillBalancingEnabled,
      skillCategories: state.skillCategories,
      teamCompositionRules: state.teamCompositionRules,
    }))
  );

  const activePlayers = players.filter((p) => !p.isReserve);

  // Don't render if skill balancing is disabled or no relevant data
  if (
    !skillBalancingEnabled ||
    activePlayers.length === 0 ||
    skillCategories.length === 0
  ) {
    return null;
  }

  return (
    <div className='border-b border-line py-4'>
      <p className='subtle mb-2'>Active players by skill</p>
      <ul className='flex flex-wrap gap-2'>
        {skillCategories.map((category) => {
          const count = activePlayers.filter(
            (p) => p.skillLevel === category.id
          ).length;
          const perTeam = teamCompositionRules[category.id];
          return (
            <li
              key={category.id}
              className='chip'
              title={
                perTeam ? `${perTeam} per team required` : undefined
              }
            >
              <span
                className='dot'
                style={{ backgroundColor: category.color }}
              />
              {category.name}
              <span className='font-display text-base font-bold leading-none'>
                {count}
              </span>
              {perTeam ? (
                <span className='font-normal text-muted'>
                  ({perTeam}/team)
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
