interface EmptyTeamsStateProps {
  skillBalancingEnabled: boolean;
  activePlayerCount: number;
}

export default function EmptyTeamsState({
  skillBalancingEnabled,
  activePlayerCount,
}: EmptyTeamsStateProps) {
  return (
    <div className='rounded-panel border-2 border-dashed border-line px-6 py-16 text-center'>
      <p className='font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl'>
        No teams yet
      </p>
      <p className='mx-auto mt-4 max-w-md text-muted'>
        {activePlayerCount === 0
          ? 'Add players on the left, then randomize to split them into teams.'
          : `Randomize teams to split your ${activePlayerCount} ${
              activePlayerCount === 1 ? 'player' : 'players'
            } into ${
              skillBalancingEnabled ? 'skill-balanced' : 'even'
            } teams.`}
      </p>
    </div>
  );
}
