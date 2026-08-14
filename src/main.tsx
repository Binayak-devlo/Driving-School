import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupScrollFix } from './utils/scrollFix.ts';

// Initialize mobile Android WebView overscroll / pull-to-refresh reload prevention
setupScrollFix();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

