import {StrictMode} from 'react';

// Sentry error monitoring
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then(Sentry => {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: 'production',
      integrations: [(Sentry as any).browserTracingIntegration()],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      ignoreErrors: [
        'Non-Error promise rejection captured',
        'ResizeObserver loop limit exceeded'
      ],
    } as any);
  }).catch(err => console.error('Sentry init failed:', err));
}
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
