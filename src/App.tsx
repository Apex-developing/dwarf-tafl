import React, { useEffect, useState } from 'react';
import { MainMenu } from './ui/MainMenu';
import { GameScreen } from './ui/GameScreen';
import { useSettingsStore } from './store';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<'menu' | 'game'>('menu');
  const language = useSettingsStore((s) => s.language);

  // Keep <html lang> in sync (screen readers, hyphenation, browser translate)
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <div className="w-full h-full min-h-screen bg-stone-950 font-sans">
      {currentScreen === 'menu' ? (
        <MainMenu onStartGame={() => setCurrentScreen('game')} />
      ) : (
        <GameScreen onBackToMenu={() => setCurrentScreen('menu')} />
      )}
    </div>
  );
};

export default App;
