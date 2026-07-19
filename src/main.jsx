import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const isElectronShell = Boolean(window.foxEvolution);
if (isElectronShell) {
  document.documentElement.classList.add('electron-shell');
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isElectronShell && <div className="electron-drag-region" aria-hidden="true" />}
    <App />
  </React.StrictMode>
);
