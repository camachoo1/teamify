import clsx from 'clsx';

interface ValidationStatusProps {
  isValid: boolean;
  violations: string[];
  className?: string;
}

export const ValidationStatus = ({
  isValid,
  violations,
  className,
}: ValidationStatusProps) => {
  if (violations.length === 0) return null;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-xs font-semibold',
        isValid ? 'text-ok' : 'text-bad',
        className
      )}
      title={isValid ? 'Team composition is valid' : violations.join(', ')}
    >
      <span
        className={clsx('dot h-2 w-2', isValid ? 'bg-ok' : 'bg-bad')}
      />
      {isValid ? 'Meets rules' : 'Needs changes'}
    </span>
  );
};
