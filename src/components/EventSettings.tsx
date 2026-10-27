import { Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import BracketBackdrop from './BracketBackdrop';

interface EventForm {
  eventName: string;
  organizerName: string;
}

export default function EventSettings() {
  const { eventName, organizerName, setEventInfo } = useStore(
    useShallow((state) => ({
      eventName: state.eventName,
      organizerName: state.organizerName,
      setEventInfo: state.setEventInfo,
    }))
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<EventForm>({
    defaultValues: {
      eventName,
      organizerName,
    },
  });

  // Reset form when store values change
  useEffect(() => {
    reset({
      eventName,
      organizerName,
    });
  }, [eventName, organizerName, reset]);

  useEffect(() => () => clearTimeout(successTimer.current), []);

  // The title is a textarea so long names wrap; grow it to fit its text
  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const { ref: registerTitle, ...titleField } = register('eventName');

  const resizeTitle = useCallback(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(resizeTitle, [eventName, resizeTitle]);

  useEffect(() => {
    // The display font changes where lines wrap, so measure again once
    // it has loaded
    document.fonts?.ready.then(resizeTitle);
    window.addEventListener('resize', resizeTitle);
    return () => window.removeEventListener('resize', resizeTitle);
  }, [resizeTitle]);

  const onSubmit = (data: EventForm) => {
    // Pasted line breaks would split the title, so join them
    const name = data.eventName.replace(/\s*\n\s*/g, ' ').trim();
    setEventInfo(name, data.organizerName.trim());
    setShowSuccess(true);

    // Reset to normal state after 2 seconds
    clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => {
      setShowSuccess(false);
    }, 2000);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      data-tour='event-settings'
      className='relative isolate rounded-panel'
    >
      <BracketBackdrop />
      <label htmlFor='event-name' className='sr-only'>
        Event name
      </label>
      <textarea
        id='event-name'
        rows={1}
        {...titleField}
        ref={(el) => {
          registerTitle(el);
          titleRef.current = el;
        }}
        onInput={resizeTitle}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit(onSubmit)();
          }
        }}
        className='block w-full resize-none overflow-hidden bg-transparent font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight placeholder:text-muted/45 focus:outline-none sm:text-7xl lg:max-w-[calc(100%-22rem)]'
        placeholder='Name your event'
        autoComplete='off'
      />

      <div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-2'>
        <label
          htmlFor='organizer-name'
          className='text-muted'
        >
          Organized by
        </label>
        <input
          id='organizer-name'
          {...register('organizerName')}
          className='min-w-0 flex-1 basis-48 border-b border-dashed border-line bg-transparent py-1 font-semibold placeholder:font-normal placeholder:text-muted/60 focus:border-accent focus:outline-none sm:max-w-xs'
          placeholder='Add your name'
          autoComplete='off'
        />
        {(isDirty || showSuccess) && (
          <button
            type='submit'
            disabled={isSubmitting || showSuccess}
            className='btn-secondary h-9'
          >
            {showSuccess ? (
              <>
                <Check size={16} />
                Saved
              </>
            ) : (
              'Save event'
            )}
          </button>
        )}
      </div>
    </form>
  );
}
