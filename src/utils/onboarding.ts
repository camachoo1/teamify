export type TooltipPosition =
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom';

export interface OnboardingStepData {
  title: string;
  description: string;
  iconType: 'users' | 'settings' | 'trophy' | 'share';
  highlight: string | null;
  position: TooltipPosition;
}

export interface OnboardingStep extends OnboardingStepData {
  icon: React.ReactNode;
}

export const ONBOARDING_STEP_DATA: OnboardingStepData[] = [
  {
    title: 'Welcome to Teamify',
    description:
      'Teamify turns a list of players into fair teams for your event. Here is the quick tour: it takes four steps.',
    iconType: 'users',
    highlight: null,
    position: 'center',
  },
  {
    title: 'Name your event',
    description:
      'Give the event a name and add who is organizing it. The name also appears on shared links.',
    iconType: 'settings',
    highlight: "[data-tour='event-settings']",
    position: 'bottom',
  },
  {
    title: 'Add your players',
    description:
      'Add players one at a time or paste a whole list. Turn on skill balancing to give each player a skill level.',
    iconType: 'users',
    highlight: "[data-tour='add-players']",
    position: 'right',
  },
  {
    title: 'Make the teams',
    description:
      'Randomize builds every team for you. Switch to Manual to create teams yourself and move players between them.',
    iconType: 'trophy',
    highlight: "[data-tour='generate-teams']",
    position: 'left',
  },
  {
    title: 'Share or export',
    description:
      'Send a read-only link to players, export a team list for Challonge, or save the whole setup as a file.',
    iconType: 'share',
    highlight: "[data-tour='export-share']",
    position: 'bottom',
  },
];

export const STORAGE_KEY = 'teamify-tour-completed';

export const calculateTooltipPosition = (
  step: OnboardingStepData
): React.CSSProperties => {
  const element = step.highlight
    ? (document.querySelector(step.highlight) as HTMLElement)
    : null;

  if (!element || step.position === 'center') {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const rect = element.getBoundingClientRect();
  const tooltipWidth = 400;
  const tooltipHeight = 300;
  const padding = 20;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let position: React.CSSProperties = {};

  switch (step.position) {
    case 'right': {
      // Check if there's enough space on the right
      if (rect.right + tooltipWidth + padding < viewportWidth) {
        position = {
          top: `${Math.max(
            padding,
            Math.min(
              viewportHeight - tooltipHeight - padding,
              rect.top + rect.height / 2 - tooltipHeight / 2
            )
          )}px`,
          left: `${rect.right + padding}px`,
          transform: 'none',
        };
      } else {
        // Fall back to left
        position = {
          top: `${Math.max(
            padding,
            Math.min(
              viewportHeight - tooltipHeight - padding,
              rect.top + rect.height / 2 - tooltipHeight / 2
            )
          )}px`,
          left: `${Math.max(
            padding,
            rect.left - tooltipWidth - padding
          )}px`,
          transform: 'none',
        };
      }
      break;
    }

    case 'left': {
      // Special handling for header export buttons
      if (step.highlight === "[data-tour='export-share']") {
        const leftPosition = Math.max(
          padding,
          rect.left - tooltipWidth - 60
        );
        const topPosition = Math.max(
          padding,
          Math.min(
            viewportHeight - tooltipHeight - padding,
            rect.top + rect.height / 2 - tooltipHeight / 2
          )
        );

        position = {
          top: `${topPosition}px`,
          left: `${leftPosition}px`,
          transform: 'none',
        };
      } else {
        // Standard left positioning
        if (rect.left - tooltipWidth - padding > 0) {
          position = {
            top: `${Math.max(
              padding,
              Math.min(
                viewportHeight - tooltipHeight - padding,
                rect.top + rect.height / 2 - tooltipHeight / 2
              )
            )}px`,
            left: `${rect.left - tooltipWidth - padding}px`,
            transform: 'none',
          };
        } else {
          // Fall back to right
          position = {
            top: `${Math.max(
              padding,
              Math.min(
                viewportHeight - tooltipHeight - padding,
                rect.top + rect.height / 2 - tooltipHeight / 2
              )
            )}px`,
            left: `${Math.min(
              viewportWidth - tooltipWidth - padding,
              rect.right + padding
            )}px`,
            transform: 'none',
          };
        }
      }
      break;
    }

    case 'top': {
      const topSpace = rect.top - tooltipHeight - padding;
      if (topSpace > 0) {
        position = {
          top: `${topSpace}px`,
          left: `${Math.max(
            padding,
            Math.min(
              viewportWidth - tooltipWidth - padding,
              rect.left + rect.width / 2 - tooltipWidth / 2
            )
          )}px`,
          transform: 'none',
        };
      } else {
        // Fall back to bottom
        position = {
          top: `${rect.bottom + padding}px`,
          left: `${Math.max(
            padding,
            Math.min(
              viewportWidth - tooltipWidth - padding,
              rect.left + rect.width / 2 - tooltipWidth / 2
            )
          )}px`,
          transform: 'none',
        };
      }
      break;
    }

    case 'bottom': {
      const bottomSpace =
        viewportHeight - rect.bottom - tooltipHeight - padding;
      if (bottomSpace > 0) {
        position = {
          top: `${rect.bottom + padding}px`,
          left: `${Math.max(
            padding,
            Math.min(
              viewportWidth - tooltipWidth - padding,
              rect.left + rect.width / 2 - tooltipWidth / 2
            )
          )}px`,
          transform: 'none',
        };
      } else {
        // Fall back to top
        position = {
          top: `${Math.max(
            padding,
            rect.top - tooltipHeight - padding
          )}px`,
          left: `${Math.max(
            padding,
            Math.min(
              viewportWidth - tooltipWidth - padding,
              rect.left + rect.width / 2 - tooltipWidth / 2
            )
          )}px`,
          transform: 'none',
        };
      }
      break;
    }

    default:
      position = {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
  }

  return position;
};

export const smoothScrollToElement = (element: HTMLElement): void => {
  const rect = element.getBoundingClientRect();
  const tooltipHeight = 300;
  const padding = 50;

  const isFullyVisible =
    rect.top >= padding &&
    rect.bottom <= window.innerHeight - tooltipHeight - padding;

  if (!isFullyVisible) {
    const elementCenter = rect.top + rect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    const scrollOffset = elementCenter - viewportCenter;

    window.scrollBy({
      top: scrollOffset,
      behavior: 'smooth',
    });
  }
};

export const highlightElement = (selector: string): void => {
  document.querySelector(selector)?.classList.add('tour-highlight');
};

export const removeAllHighlights = (
  steps: OnboardingStepData[]
): void => {
  steps.forEach((step) => {
    if (step.highlight) {
      document
        .querySelector(step.highlight)
        ?.classList.remove('tour-highlight');
    }
  });
};
