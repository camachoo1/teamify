import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { decodeShareData, isChallongeUrl } from '../utils/share';
import { getTeamColor } from '../utils/teamColors';
import BracketBackdrop from './BracketBackdrop';

interface SharedTeam {
  n: string; // name
  p: Array<{
    n: string; // name
    s?: string; // skillLevel
  }>;
}

interface SharedData {
  e: string; // eventName
  o: string; // organizerName
  t: SharedTeam[]; // teams
  r?: Array<{
    // reserve players (optional)
    n: string; // name
    s?: string; // skillLevel
  }>;
  // Handle both old and new formats for skill categories
  s?: Array<{
    // OLD format - skillCategories
    i: string; // id
    n: string; // name
    c: string; // color
  }>;
  sc?: Array<{
    // NEW format - skillCategories (compact)
    i: string; // id
    n: string; // name
    c: string; // color
  }>;
  sb: boolean; // skillBalancingEnabled
  b?: Array<{
    // brackets (optional)
    i: string; // id
    t: string; // title
    u: string; // embedUrl
  }>;
  ts: number; // timestamp
}

export default function ShareView() {
  const [sharedData, setSharedData] = useState<SharedData | null>(
    null
  );
  const [error, setError] = useState<string>('');
  const [isShareView, setIsShareView] = useState(false);
  const [selectedBracket, setSelectedBracket] = useState<
    NonNullable<SharedData['b']>[number] | null
  >(null);

  useEffect(() => {
    const checkForShareData = () => {
      const hash = window.location.hash;

      if (hash.startsWith('#share=')) {
        setIsShareView(true);
        const encodedData = hash.replace('#share=', '');

        try {
          const parsedData = decodeShareData(encodedData) as SharedData;
          if (!parsedData || !Array.isArray(parsedData.t)) {
            throw new Error('Share data has no teams');
          }

          // Only embed Challonge brackets; anything else in the link is dropped
          parsedData.b = parsedData.b?.filter((bracket) =>
            isChallongeUrl(bracket?.u)
          );

          setSharedData(parsedData);
          setError('');

          // Set first bracket as selected if any exist
          setSelectedBracket(parsedData.b?.[0] ?? null);
        } catch (err) {
          console.error('Decode error:', err);
          setError('Invalid or corrupted share link');
        }
      }
    };

    checkForShareData();
    window.addEventListener('hashchange', checkForShareData);
    return () =>
      window.removeEventListener('hashchange', checkForShareData);
  }, []);

  const getSkillCategoryInfo = (skillCategoryId?: string) => {
    if (!sharedData) return undefined;

    // Use either the new format (sc) or old format (s)
    const skillCategories = sharedData.sc || sharedData.s || [];
    return skillCategories.find((cat) => cat.i === skillCategoryId);
  };

  const getSkillCategoryCounts = () => {
    if (!sharedData?.sb) return [];

    // Use either the new format (sc) or old format (s)
    const skillCategories = sharedData.sc || sharedData.s || [];

    if (skillCategories.length === 0) return [];

    return skillCategories.map((category) => ({
      ...category,
      count:
        // Count players in teams
        sharedData.t.reduce(
          (total, team) =>
            total + team.p.filter((p) => p.s === category.i).length,
          0
        ) +
        // Count reserve players
        (sharedData.r?.filter((p) => p.s === category.i).length || 0),
    }));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTeamSkillDistribution = (teamPlayers: any[]) => {
    if (!sharedData?.sb) return null;

    // Use either the new format (sc) or old format (s)
    const skillCategories = sharedData.sc || sharedData.s || [];

    if (skillCategories.length === 0) return null;

    const distribution = skillCategories
      .map((category) => ({
        ...category,
        count: teamPlayers.filter((p) => p.s === category.i).length,
      }))
      .filter((cat) => cat.count > 0);

    return distribution;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const goToMain = () => {
    window.location.hash = '';
    setIsShareView(false);
  };

  // Don't render if not in share view
  if (!isShareView) {
    return null;
  }

  const shell = (content: React.ReactNode) => (
    <div className='relative isolate flex min-h-screen flex-col'>
      <header className='border-b border-line bg-paper/95'>
        <div className='mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-8'>
          <span className='font-display text-3xl font-black uppercase leading-none tracking-tight'>
            Teamify
          </span>
          <button onClick={goToMain} className='btn-outline'>
            <ArrowLeft size={16} />
            Make your own teams
          </button>
        </div>
      </header>
      <main className='mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-8 sm:px-8'>
        {content}
      </main>
    </div>
  );

  if (error) {
    return shell(
      <div className='mx-auto max-w-md py-16 text-center'>
        <h1 className='font-display text-5xl font-extrabold uppercase leading-none'>
          Link not found
        </h1>
        <p className='mb-6 mt-3 text-muted'>
          This share link is incomplete or damaged. Ask the organizer
          to send it again.
        </p>
        <button onClick={goToMain} className='btn-primary'>
          Open Teamify
        </button>
      </div>
    );
  }

  if (!sharedData) {
    return shell(
      <p className='flex items-center justify-center gap-2 py-24 text-muted'>
        <Loader2 size={18} className='animate-spin' />
        Loading teams…
      </p>
    );
  }

  const skillCategories = sharedData.sc || sharedData.s || [];
  const showSkills = Boolean(sharedData.sb) && skillCategories.length > 0;
  const playingCount = sharedData.t.reduce(
    (total, team) => total + team.p.length,
    0
  );
  const reserves = sharedData.r ?? [];

  return shell(
    <>
      {/* Event */}
      <div className='relative isolate'>
        <BracketBackdrop />
        <h1 className='font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:max-w-[calc(100%-22rem)]'>
          {sharedData.e || 'Untitled event'}
        </h1>
        <p className='mt-3 text-muted'>
          {sharedData.o ? `Organized by ${sharedData.o}. ` : ''}
          {sharedData.t.length}{' '}
          {sharedData.t.length === 1 ? 'team' : 'teams'} and{' '}
          {playingCount} {playingCount === 1 ? 'player' : 'players'}
          {reserves.length > 0
            ? `, plus ${reserves.length} on the bench`
            : ''}
          . Shared {formatDate(sharedData.ts)}.
        </p>
      </div>

      {showSkills && (
        <ul className='mt-5 flex flex-wrap items-center gap-2'>
          {getSkillCategoryCounts().map((category) => (
            <li key={category.i} className='chip'>
              <span
                className='dot'
                style={{ backgroundColor: category.c }}
              />
              {category.n}
              <span className='font-display text-base font-bold leading-none'>
                {category.count}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Teams Grid */}
      <div className='mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {sharedData.t.map((team, index) => {
          const skillDistribution = getTeamSkillDistribution(team.p);
          const teamColor = getTeamColor(index);

          return (
            <section
              key={index}
              aria-label={team.n}
              className='animate-deal overflow-hidden rounded-[18px] border border-line bg-surface'
              style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
            >
              <div className='h-2' style={{ backgroundColor: teamColor }} />
              <div className='p-5'>
                <div className='mb-4 flex items-start gap-3'>
                  <span
                    className='font-display text-5xl font-black leading-[0.8]'
                    style={{ color: teamColor }}
                    aria-hidden='true'
                  >
                    {index + 1}
                  </span>
                  <div className='min-w-0'>
                    <h2 className='truncate font-display text-2xl font-bold leading-tight'>
                      {team.n}
                    </h2>
                    <p className='text-sm text-muted'>
                      {team.p.length}{' '}
                      {team.p.length === 1 ? 'player' : 'players'}
                    </p>
                  </div>
                </div>

                {skillDistribution && skillDistribution.length > 0 && (
                  <ul className='mb-3 flex flex-wrap gap-1.5'>
                    {skillDistribution.map((skill) => (
                      <li key={skill.i} className='chip font-medium' title={skill.n}>
                        <span
                          className='dot h-2 w-2'
                          style={{ backgroundColor: skill.c }}
                        />
                        {skill.count}
                      </li>
                    ))}
                  </ul>
                )}

                <ul className='space-y-1.5'>
                  {team.p.map((player, playerIndex) => {
                    const skillInfo = showSkills
                      ? getSkillCategoryInfo(player.s)
                      : undefined;
                    return (
                      <li
                        key={playerIndex}
                        className='flex items-center gap-2.5 rounded-xl border border-line bg-paper/60 px-3 py-2'
                      >
                        {skillInfo && (
                          <span
                            className='dot'
                            style={{ backgroundColor: skillInfo.c }}
                            title={skillInfo.n}
                          />
                        )}
                        <span className='truncate font-medium'>
                          {player.n}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      {/* Reserves */}
      {reserves.length > 0 && (
        <section className='mt-10' aria-labelledby='bench-heading'>
          <h2 id='bench-heading' className='section-title mb-3'>
            On the bench
          </h2>
          <ul className='flex flex-wrap gap-2'>
            {reserves.map((player, index) => {
              const skillInfo = showSkills
                ? getSkillCategoryInfo(player.s)
                : undefined;
              return (
                <li key={index} className='chip px-3 py-1 text-sm'>
                  {skillInfo && (
                    <span
                      className='dot'
                      style={{ backgroundColor: skillInfo.c }}
                    />
                  )}
                  {player.n}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Brackets */}
      {sharedData.b && sharedData.b.length > 0 && (
        <section className='mt-12' aria-labelledby='shared-brackets-heading'>
          <h2 id='shared-brackets-heading' className='section-title mb-3'>
            Brackets
          </h2>
          {sharedData.b.length > 1 && (
            <div className='segmented mb-4' role='group' aria-label='Bracket'>
              {sharedData.b.map((bracket) => (
                <button
                  key={bracket.i}
                  type='button'
                  aria-pressed={selectedBracket?.i === bracket.i}
                  onClick={() => setSelectedBracket(bracket)}
                >
                  {bracket.t}
                </button>
              ))}
            </div>
          )}
          {selectedBracket && (
            <div className='overflow-hidden rounded-panel border border-line bg-surface'>
              <div className='flex items-center justify-between gap-4 border-b border-line px-5 py-3'>
                <h3 className='truncate font-display text-2xl font-bold'>
                  {selectedBracket.t}
                </h3>
                <a
                  href={selectedBracket.u.replace('/module', '')}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='btn-ghost h-8 shrink-0'
                >
                  Open on Challonge
                  <ExternalLink size={14} />
                </a>
              </div>
              <iframe
                title={`${selectedBracket.t} bracket`}
                src={selectedBracket.u}
                width='100%'
                height='600'
                className='block bg-white'
              />
            </div>
          )}
        </section>
      )}
    </>
  );
}
