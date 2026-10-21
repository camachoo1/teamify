import { SlidersHorizontal } from 'lucide-react';
import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import Switch from '../ui/Switch';

interface FeatureTogglesProps {
  onShowSkillSettings: () => void;
}

export default function FeatureToggles({
  onShowSkillSettings,
}: FeatureTogglesProps) {
  const {
    skillBalancingEnabled,
    toggleSkillBalancing,
    reservePlayersEnabled,
    toggleReserveMode,
  } = useStore(
    useShallow((state) => ({
      skillBalancingEnabled: state.skillBalancingEnabled,
      toggleSkillBalancing: state.toggleSkillBalancing,
      reservePlayersEnabled: state.reservePlayersEnabled,
      toggleReserveMode: state.toggleReserveMode,
    }))
  );

  return (
    <div className='divide-y divide-line border-b border-line'>
      <div className='flex items-center gap-3 py-3'>
        <div className='flex-1'>
          <p className='font-semibold'>Balance by skill</p>
          <p className='subtle'>
            Spread each skill level evenly across teams.
          </p>
        </div>
        {skillBalancingEnabled && (
          <button
            type='button'
            onClick={onShowSkillSettings}
            className='icon-btn'
            title='Skill levels and team rules'
            aria-label='Skill levels and team rules'
          >
            <SlidersHorizontal size={17} />
          </button>
        )}
        <Switch
          checked={skillBalancingEnabled}
          onChange={toggleSkillBalancing}
          label='Balance by skill'
        />
      </div>

      <div className='flex items-center gap-3 py-3'>
        <div className='flex-1'>
          <p className='font-semibold'>Reserves</p>
          <p className='subtle'>
            Keep extra players on the bench, out of the teams.
          </p>
        </div>
        <Switch
          checked={reservePlayersEnabled}
          onChange={toggleReserveMode}
          label='Reserves'
        />
      </div>
    </div>
  );
}
