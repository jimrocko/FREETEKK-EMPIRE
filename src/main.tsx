import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/anton/400.css';
import '@fontsource/chakra-petch/400.css';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource-variable/space-grotesk';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/layout.css';
import './ui/styles/components.css';
import './ui/styles/game.css';
import { App } from './ui/App';
import { boot } from './app/runtime';

boot();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
