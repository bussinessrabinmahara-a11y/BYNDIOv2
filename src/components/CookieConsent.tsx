import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CONSENT_KEY = 'byndio_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(CONSENT_KEY);
    if (!saved) {
      setTimeout(() => setVisible(true), 1500);
    } else {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.accepted) {
          enableTracking();
        }
      } catch {}
    }
  }, []);

  // M-25: Actually enable/disable tracking based on consent
  const enableTracking = () => {
    // Enable GA if configured
    const gaId = (window as any).__GA_ID__;
    if (gaId && gaId !== '__GA_ID__' && !gaId.includes('XXXX')) {
      if (!(window as any).gtag) {
        const s = document.createElement('script');
        s.async = true;
        s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(s);
        (window as any).dataLayer = (window as any).dataLayer || [];
        const gtag = (...args: any[]) => (window as any).dataLayer.push(args);
        (window as any).gtag = gtag;
        gtag('js', new Date());
        gtag('config', gaId);
      }
    }
  };

  const disableTracking = () => {
    // Remove GA cookies
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      if (name.startsWith('_ga') || name.startsWith('_gid')) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
      }
    });
  };

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }));
    setVisible(false);
    enableTracking();
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }));
    setVisible(false);
    disableTracking();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-3 md:p-4">
      <div className="max-w-4xl mx-auto bg-[#0D1117] text-white rounded-xl shadow-2xl p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5">
        <div className="text-2xl shrink-0">🍪</div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-relaxed text-gray-200">
            We use cookies to personalise your experience, analyse traffic and improve our services.
            By clicking <strong>"Accept All"</strong>, you consent to our use of cookies as described in our{' '}
            <Link to="/legal/privacy" className="text-[#4FC3F7] hover:underline">Privacy Policy</Link>.
            Under India's{' '}
            <span className="text-[#FFD600] font-semibold">DPDP Act 2023</span>, you have the right to withdraw consent at any time.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 w-full md:w-auto">
          <button onClick={decline}
            className="flex-1 md:flex-none px-4 py-2 border border-gray-600 text-gray-300 rounded-lg text-[12px] font-bold hover:bg-gray-800 transition-colors">
            Decline
          </button>
          <button onClick={accept}
            className="flex-1 md:flex-none px-5 py-2 bg-[#0D47A1] hover:bg-[#1565C0] text-white rounded-lg text-[12px] font-bold transition-colors">
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}

