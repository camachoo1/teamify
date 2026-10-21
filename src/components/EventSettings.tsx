import { Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useEffect, useRef, useState } from 'react';
import useStore from '../store/useStore';
import { useShallow } from 'zustand/react/shallow';

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

  const onSubmit = (data: EventForm) => {
    setEventInfo(data.eventName.trim(), data.organizerName.trim());
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
      className='rounded-panel'
    >
      <label htmlFor='event-name' className='sr-only'>
        Event name
      </label>
      <input
        id='event-name'
        {...register('eventName')}
        className='w-full bg-transparent font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight placeholder:text-muted/45 focus:outline-none sm:text-7xl'
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
