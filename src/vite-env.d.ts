/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PROD: boolean;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_RAZORPAY_KEY_ID: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_GA_ID: string;
  readonly VITE_CLARITY_ID: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '@sentry/react' {
  export function init(config: {
    dsn?: string;
    environment?: string;
    tracesSampleRate?: number;
  }): void;
}
