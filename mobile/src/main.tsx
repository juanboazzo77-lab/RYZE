import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import { App } from './App';
import './styles.css';
import { applyStoredTheme } from './theme';

applyStoredTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Los mismos avisos que la web. */}
    <Toaster
      position="top-center"
      offset="calc(env(safe-area-inset-top) + 12px)"
      mobileOffset="calc(env(safe-area-inset-top) + 12px)"
      toastOptions={{ classNames: { toast: '!bg-card !text-card-foreground !border !shadow-lg' } }}
    />
  </StrictMode>,
);
