import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster 
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: 'dark:bg-gray-800 dark:text-white',
        style: {
          background: 'var(--toast-bg)',
          color: 'var(--toast-color)',
        },
      }}
    />
  </StrictMode>
);