import { useEffect } from 'react';

const BASE = 'BYNDIO';

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE}` : `${BASE} — India's 0% Commission Marketplace`;
    return () => { document.title = `${BASE} — India's 0% Commission Marketplace`; };
  }, [title]);
}
