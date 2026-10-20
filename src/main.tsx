import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register offline service worker for iOS PWA
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New Nicotex update available.');
  },
  onOfflineReady() {
    console.log('Nicotex is ready for offline operation.');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
