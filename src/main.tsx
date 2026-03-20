/**
 * @file main.tsx
 * @description Point d'entrée React — monte l'application dans le DOM.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/animations.css';

// Import Tailwind CSS (via PostCSS dans vite)
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
