import useStore from '../../store/useStore';
import BracketIntegration from '../BracketIntegration';
import TournamentBoard from './TournamentBoard';
import TournamentSetup from './TournamentSetup';

export default function TournamentView() {
  const tournament = useStore((state) => state.tournament);

  return (
    <div className='space-y-14'>
      {tournament ? (
        <TournamentBoard tournament={tournament} />
      ) : (
        <TournamentSetup />
      )}
      <BracketIntegration />
    </div>
  );
}
