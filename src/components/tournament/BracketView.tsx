import {
  MatchStage,
  ResolvedMatch,
  Tournament,
} from '../../tournament/types';
import { roundLabel } from '../../tournament/labels';
import MatchCard from './MatchCard';

interface BracketViewProps {
  tournament: Tournament;
  resolved: ResolvedMatch[];
  onOpenMatch: (match: ResolvedMatch) => void;
}

interface Section {
  title: string;
  stages: MatchStage[];
}

export default function BracketView({
  tournament,
  resolved,
  onOpenMatch,
}: BracketViewProps) {
  const bracket = resolved.filter((m) => m.stage !== 'group');
  const isDouble = bracket.some((m) => m.stage === 'upper');

  const sections: Section[] = isDouble
    ? [
        { title: 'Upper bracket', stages: ['upper'] },
        { title: 'Lower bracket', stages: ['lower'] },
        { title: 'Grand final', stages: ['grand', 'reset'] },
      ]
    : [{ title: 'Bracket', stages: ['single'] }];

  return (
    <div className='space-y-10'>
      {sections.map((section) => {
        const matches = bracket.filter((m) =>
          section.stages.includes(m.stage)
        );
        // Hide matches that will never be played (both sides empty)
        const shown = matches.filter(
          (m) => m.status !== 'void' || m.stage === 'reset'
        );
        if (shown.length === 0) return null;

        const roundCount = Math.max(...matches.map((m) => m.round));
        const columns =
          section.stages[0] === 'grand'
            ? [
                {
                  key: 'grand',
                  label: 'Grand final',
                  matches: shown,
                },
              ]
            : Array.from({ length: roundCount }, (_, i) => {
                const round = i + 1;
                return {
                  key: String(round),
                  label: roundLabel(
                    { stage: section.stages[0], round },
                    roundCount
                  ),
                  matches: shown.filter((m) => m.round === round),
                };
              }).filter((column) => column.matches.length > 0);

        return (
          <section key={section.title} aria-label={section.title}>
            {isDouble && (
              <h3 className='mb-3 font-display text-2xl font-bold'>
                {section.title}
              </h3>
            )}
            <div className='scrollbar-custom -mx-4 overflow-x-auto px-4 pb-2 sm:-mx-0 sm:px-0'>
              <div className='flex min-w-max gap-4'>
                {columns.map((column) => (
                  <div key={column.key} className='flex flex-col'>
                    <p className='subtle mb-2 px-2 font-semibold'>
                      {column.label}
                    </p>
                    <div className='flex flex-1 flex-col justify-around gap-3'>
                      {column.matches.map((match) => (
                        <MatchCard
                          key={match.id}
                          tournament={tournament}
                          match={match}
                          onOpen={onOpenMatch}
                          caption={
                            match.stage === 'reset'
                              ? match.status === 'void'
                                ? 'Reset not needed'
                                : 'Reset, if the lower team wins'
                              : column.matches.length > 1
                              ? `Match ${match.order}`
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
