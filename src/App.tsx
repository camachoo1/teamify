import { useEffect, useState } from 'react';
import Header from './components/Header';
import EventSettings from './components/EventSettings';
import useStore from './store/useStore';
import History from './components/History';
import ShareView from './components/ShareView';
import PlayerDisplay from './components/players/PlayerDisplay';
import TeamDisplay from './components/teams/TeamDisplay';
import Footer from './components/Footer';
import OnboardingOverlay from './components/OnboardingOverlay';
import TopoBackdrop from './components/TopoBackdrop';
import TournamentView from './components/tournament/TournamentView';

function App() {
  const darkMode = useStore((state) => state.darkMode);
  const activeView = useStore((state) => state.activeView);
  const setActiveView = useStore((state) => state.setActiveView);
  const [isShareView, setIsShareView] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Ensure dark mode class is applied on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Check if we're in share view
  useEffect(() => {
    const checkShareView = () => {
      const hash = window.location.hash;
      setIsShareView(hash.startsWith('#share='));
    };

    checkShareView();
    window.addEventListener('hashchange', checkShareView);
    return () =>
      window.removeEventListener('hashchange', checkShareView);
  }, []);

  // Check if user has completed the tour
  useEffect(() => {
    const tourCompleted = localStorage.getItem(
      'teamify-tour-completed'
    );
    if (!tourCompleted && !isShareView) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setActiveView('teams');
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isShareView, setActiveView]);

  // If in share view, show only the ShareView component
  if (isShareView) {
    return <ShareView />;
  }

  return (
    <>
      <div className='relative isolate flex min-h-screen flex-col'>
        <TopoBackdrop />

        <Header />

        <main className='mx-auto w-full max-w-[1400px] flex-1 px-4 pb-16 pt-8 sm:px-8'>
          <EventSettings />

          {activeView === 'tournament' ? (
            <div className='mt-8'>
              <TournamentView />
            </div>
          ) : (
            <>
              <div className='mt-8 grid items-start gap-8 lg:grid-cols-[minmax(320px,400px)_1fr]'>
                <PlayerDisplay />
                <TeamDisplay />
              </div>

              <div className='mt-14 max-w-3xl'>
                <History />
              </div>
            </>
          )}
        </main>

        <Footer />
      </div>

      <OnboardingOverlay
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </>
  );
}

export default App;
