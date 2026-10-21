import { CheckCircle, AlertTriangle } from 'lucide-react';
import useStore from '../../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { validateTeamComposition } from '../../../utils/helper';

export const GlobalValidationSummary = () => {
  const {
    teams,
    players,
    skillCategories,
    teamCompositionRules,
    skillBalancingEnabled,
    manualTeamMode,
  } = useStore(
    useShallow((state) => ({
      teams: state.teams,
      players: state.players,
      skillCategories: state.skillCategories,
      teamCompositionRules: state.teamCompositionRules,
      skillBalancingEnabled: state.skillBalancingEnabled,
      manualTeamMode: state.manualTeamMode,
    }))
  );

  // Only show in manual mode with skill balancing enabled
  if (
    !manualTeamMode ||
    !skillBalancingEnabled ||
    Object.keys(teamCompositionRules).length === 0
  ) {
    return null;
  }

  const allValidations = teams.map((team) => ({
    team,
    validation: validateTeamComposition(
      team,
      players,
      skillCategories,
      teamCompositionRules,
      skillBalancingEnabled
    ),
  }));

  const invalidTeams = allValidations.filter(
    (t) => !t.validation.isValid
  );
  const totalViolations = invalidTeams.reduce(
    (sum, t) => sum + t.validation.violations.length,
    0
  );

  if (invalidTeams.length === 0 && teams.length > 0) {
    return (
      <p className='notice-ok flex items-center gap-2'>
        <CheckCircle className='shrink-0 text-ok' size={18} />
        All {teams.length} teams match the team rules.
      </p>
    );
  }

  if (invalidTeams.length > 0) {
    return (
      <div className='notice-bad flex items-start gap-2'>
        <AlertTriangle className='mt-0.5 shrink-0 text-bad' size={18} />
        <div>
          <p className='font-semibold'>
            {invalidTeams.length} of {teams.length} teams don't match
            the team rules ({totalViolations}{' '}
            {totalViolations === 1 ? 'issue' : 'issues'}).
          </p>
          <ul className='mt-1 space-y-0.5 text-muted'>
            {invalidTeams.slice(0, 3).map(({ team, validation }) => (
              <li key={team.id}>
                <span className='font-semibold text-ink'>
                  {team.name}:
                </span>{' '}
                {validation.violations[0]}
                {validation.violations.length > 1 &&
                  ` (and ${validation.violations.length - 1} more)`}
              </li>
            ))}
            {invalidTeams.length > 3 && (
              <li>And {invalidTeams.length - 3} more teams.</li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  return null;
};
