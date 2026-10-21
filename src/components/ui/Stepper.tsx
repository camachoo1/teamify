import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  label: string;
  value: number;
  display?: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export default function Stepper({
  label,
  value,
  display,
  min,
  max,
  onChange,
}: StepperProps) {
  return (
    <div>
      <p className='mb-1 text-sm text-muted'>{label}</p>
      <div className='flex items-center gap-1'>
        <button
          type='button'
          className='icon-btn border border-line'
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus size={15} />
        </button>
        <output
          className='w-12 text-center font-display text-3xl font-bold leading-none'
          aria-live='polite'
        >
          {display ?? value}
        </output>
        <button
          type='button'
          className='icon-btn border border-line'
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}
