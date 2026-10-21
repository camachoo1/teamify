import useStore from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import Stepper from '../ui/Stepper';

export default function TournamentSettings() {
  const { players, teamSize, setTeamSize, maxTeams, setMaxTeams } =
    useStore(
      useShallow((state) => ({
        players: state.players,
        teamSize: state.teamSize,
        setTeamSize: state.setTeamSize,
        maxTeams: state.maxTeams,
        setMaxTeams: state.setMaxTeams,
      }))
    );

  // Calculate stats
  const activePlayers = players.filter((p) => !p.isReserve);
  const estimatedTeams =
    activePlayers.length > 0
      ? Math.ceil(activePlayers.length / teamSize)
      : 0;
  const teamCount =
    maxTeams > 0 ? Math.min(maxTeams, estimatedTeams) : estimatedTeams;
  const maxActiveSlots = maxTeams * teamSize;
  const isAtCapacity =
    maxTeams > 0 && activePlayers.length >= maxActiveSlots;

  const summary =
    activePlayers.length === 0
      ? 'Add players to see how many teams you will get.'
      : `Makes ${teamCount} ${teamCount === 1 ? 'team' : 'teams'}${
          maxTeams > 0
            ? `, ${activePlayers.length} of ${maxActiveSlots} spots filled`
            : ''
        }.`;

  return (
    <div className='border-b border-line pb-5'>
      <div className='flex flex-wrap gap-x-8 gap-y-4'>
        <Stepper
          label='Players per team'
          value={teamSize}
          min={1}
          max={10}
          onChange={setTeamSize}
        />
        <Stepper
          label='Team limit'
          value={maxTeams}
          display={maxTeams === 0 ? '∞' : undefined}
          min={0}
          max={64}
          onChange={setMaxTeams}
        />
      </div>
      <p className='subtle mt-3'>
        {summary}
        {isAtCapacity && (
          <span className='ml-1 font-semibold text-ink'>
            Teams are full; new players can join as reserves.
          </span>
        )}
      </p>
    </div>
  );
}
