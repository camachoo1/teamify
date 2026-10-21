import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import { useOnboarding } from '../hooks/useOnboarding';

interface OnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingOverlay = ({
  isOpen,
  onClose,
}: OnboardingOverlayProps) => {
  const {
    currentStep,
    currentStepData,
    totalSteps,
    isTransitioning,
    tooltipPosition,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    isFirstStep,
    isLastStep,
  } = useOnboarding(isOpen);

  const handleClose = () => {
    completeTour();
    onClose();
  };

  const handleSkip = () => {
    skipTour();
    onClose();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleClose();
    } else {
      nextStep();
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 bg-ink/45'>
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='tour-title'
        className={clsx(
          'absolute w-96 max-w-[90vw] rounded-panel border border-line bg-surface p-6 shadow-2xl shadow-ink/25 transition-opacity duration-200',
          isTransitioning ? 'pointer-events-none opacity-0' : 'opacity-100'
        )}
        style={tooltipPosition}
      >
        <button
          onClick={handleClose}
          className='icon-btn absolute right-3 top-3'
          aria-label='Close tour'
        >
          <X size={18} />
        </button>

        <p className='subtle mb-2'>
          {isFirstStep
            ? 'Quick tour'
            : `Step ${currentStep} of ${totalSteps - 1}`}
        </p>
        <h3
          id='tour-title'
          className='mb-2 pr-8 font-display text-3xl font-bold leading-none'
        >
          {currentStepData.title}
        </h3>
        <p className='mb-6 text-muted'>{currentStepData.description}</p>

        <div className='mb-6 flex gap-1.5' aria-hidden='true'>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className={clsx(
                'h-1.5 flex-1 rounded-full transition-colors',
                index <= currentStep ? 'bg-accent' : 'bg-sunk'
              )}
            />
          ))}
        </div>

        <div className='flex items-center justify-between gap-2'>
          {isFirstStep ? (
            <button onClick={handleSkip} className='btn-ghost -ml-3'>
              Skip tour
            </button>
          ) : (
            <button onClick={prevStep} className='btn-ghost -ml-3'>
              <ChevronLeft size={16} />
              Back
            </button>
          )}
          <button onClick={handleNext} className='btn-primary'>
            {isFirstStep
              ? 'Start the tour'
              : isLastStep
              ? 'Finish'
              : 'Next'}
            {!isLastStep && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
