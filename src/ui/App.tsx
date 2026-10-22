import { useApp } from '../app/store';
import { AppShell } from './layout/AppShell';
import { StartScreen } from './screens/start/StartScreen';
import { Toasts } from './layout/Toasts';

export function App() {
  const hasGame = useApp((a) => a.game !== null);
  if (!hasGame) {
    return (
      <>
        <StartScreen />
        <Toasts />
      </>
    );
  }
  return <AppShell />;
}
