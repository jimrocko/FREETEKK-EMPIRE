import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './ui/styles/tokens.css';
import './ui/styles/base.css';
import './ui/styles/layout.css';
import './ui/styles/components.css';
import { App } from './ui/App';
import { boot } from './app/runtime';

boot();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
