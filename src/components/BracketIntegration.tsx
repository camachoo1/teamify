import { useState } from 'react';
import { Plus, X, ExternalLink, Info } from 'lucide-react';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';

interface BracketForm {
  embedUrl: string;
  title: string;
}

interface SavedBracket {
  id: string;
  title: string;
  embedUrl: string;
  timestamp: string;
}

// Challonge pages that are not tournaments
const RESERVED_PATHS = new Set([
  'tournaments',
  'users',
  'communities',
  'organizations',
  'search',
  'settings',
  'login',
  'signup',
]);

export default function BracketIntegration() {
  const [brackets, setBrackets] = useState<SavedBracket[]>(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem('saved-brackets') || '[]'
      );
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedBracket, setSelectedBracket] =
    useState<SavedBracket | null>(
      brackets.length > 0 ? brackets[0] : null
    );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BracketForm>();

  const extractChallongePath = (input: string): string | null => {
    // Handle full URLs and embed codes, e.g. https://challonge.com/huc8sajc,
    // https://challonge.com/en/huc8sajc or .../huc8sajc/module.
    // Subdomain (organization) URLs keep their subdomain.
    const urlMatch = input.match(
      /((?:[a-zA-Z0-9-]+\.)?challonge\.com)\/(?:[a-z]{2}(?:-[A-Z]{2})?\/(?!module\b))?([a-zA-Z0-9_]+)/
    );
    if (urlMatch) {
      const [, host, id] = urlMatch;
      return RESERVED_PATHS.has(id.toLowerCase()) ? null : `${host}/${id}`;
    }

    // Handle just the ID
    if (/^[a-zA-Z0-9_]+$/.test(input)) return `challonge.com/${input}`;

    return null;
  };

  const onSubmit = (data: BracketForm) => {
    const tournamentPath = extractChallongePath(data.embedUrl.trim());
    if (!tournamentPath) return;

    const newBracket: SavedBracket = {
      id: Date.now().toString(),
      title: data.title,
      embedUrl: `https://${tournamentPath}/module`,
      timestamp: new Date().toISOString(),
    };

    const updatedBrackets = [...brackets, newBracket];
    setBrackets(updatedBrackets);
    localStorage.setItem(
      'saved-brackets',
      JSON.stringify(updatedBrackets)
    );

    setSelectedBracket(newBracket);
    setShowAddForm(false);
    reset();
  };

  const deleteBracket = (id: string) => {
    const updatedBrackets = brackets.filter((b) => b.id !== id);
    setBrackets(updatedBrackets);
    localStorage.setItem(
      'saved-brackets',
      JSON.stringify(updatedBrackets)
    );

    if (selectedBracket?.id === id) {
      setSelectedBracket(updatedBrackets[0] || null);
    }
  };

  return (
    <section aria-labelledby='brackets-heading' className='min-w-0'>
      <div className='mb-4 flex items-end justify-between gap-4'>
        <div>
          <h2 id='brackets-heading' className='section-title'>
            Brackets
          </h2>
          <p className='subtle mt-1'>
            Show your Challonge brackets here and on shared links.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={showAddForm ? 'btn-ghost' : 'btn-outline'}
          aria-expanded={showAddForm}
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? 'Cancel' : 'Add bracket'}
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className='panel mb-5 grid gap-4 sm:grid-cols-2'
        >
          <div>
            <label htmlFor='bracket-title' className='field-label'>
              Bracket name
            </label>
            <input
              id='bracket-title'
              {...register('title', {
                required: 'Give the bracket a name',
              })}
              className='input-field'
              placeholder='Main draw'
            />
            {errors.title && (
              <p className='mt-1 text-sm text-bad'>
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor='bracket-url' className='field-label'>
              Challonge link or embed code
            </label>
            <input
              id='bracket-url'
              {...register('embedUrl', {
                required: 'Paste a Challonge link or embed code',
                validate: (value) =>
                  extractChallongePath(value.trim()) !== null ||
                  "That doesn't look like a Challonge tournament link",
              })}
              className='input-field'
              placeholder='https://challonge.com/your-tournament'
            />
            {errors.embedUrl && (
              <p className='mt-1 text-sm text-bad'>
                {errors.embedUrl.message}
              </p>
            )}
          </div>

          <p className='flex items-start gap-2 text-sm text-muted sm:col-span-2'>
            <Info size={16} className='mt-0.5 shrink-0' />
            On Challonge, open your tournament, choose Share, then
            Embed, and copy the link or code.
          </p>

          <button type='submit' className='btn-primary sm:col-span-2 sm:justify-self-start'>
            Add bracket
          </button>
        </form>
      )}

      {brackets.length === 0 ? (
        !showAddForm && (
          <p className='rounded-panel border-2 border-dashed border-line px-6 py-8 text-center text-muted'>
            No brackets yet. Add a Challonge bracket to keep it next to
            your teams.
          </p>
        )
      ) : (
        <>
          <ul className='mb-4 flex flex-wrap gap-2'>
            {brackets.map((bracket) => {
              const isSelected = selectedBracket?.id === bracket.id;
              return (
                <li
                  key={bracket.id}
                  className={clsx(
                    'flex items-center rounded-full border pl-1 pr-1 transition-colors',
                    isSelected
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line hover:bg-sunk'
                  )}
                >
                  <button
                    type='button'
                    onClick={() => setSelectedBracket(bracket)}
                    aria-pressed={isSelected}
                    className='px-3 py-1.5 text-sm font-semibold'
                    title={`Added ${new Date(
                      bracket.timestamp
                    ).toLocaleDateString()}`}
                  >
                    {bracket.title}
                  </button>
                  <button
                    type='button'
                    onClick={() => deleteBracket(bracket.id)}
                    className={clsx(
                      'grid h-7 w-7 place-items-center rounded-full transition-colors',
                      isSelected
                        ? 'hover:bg-paper/20'
                        : 'text-muted hover:bg-line hover:text-bad'
                    )}
                    aria-label={`Remove ${bracket.title}`}
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>

          {selectedBracket && (
            <div className='overflow-hidden rounded-panel border border-line bg-surface'>
              <div className='flex items-center justify-between gap-4 border-b border-line px-5 py-3'>
                <h3 className='truncate font-display text-2xl font-bold'>
                  {selectedBracket.title}
                </h3>
                <a
                  href={selectedBracket.embedUrl.replace('/module', '')}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='btn-ghost h-8 shrink-0'
                >
                  Open on Challonge
                  <ExternalLink size={14} />
                </a>
              </div>
              <iframe
                title={`${selectedBracket.title} bracket`}
                src={selectedBracket.embedUrl}
                width='100%'
                height='600'
                className='block bg-white'
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
