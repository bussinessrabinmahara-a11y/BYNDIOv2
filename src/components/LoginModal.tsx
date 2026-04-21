import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Eye, EyeOff, AlertCircle, Phone, Shield, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/email';
import { useAppStore } from '../store';
import { validators } from '../lib/validators';

type AuthMode = 'login' | 'register' | 'otp' | '2fa';

export default function LoginModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'buyer' | 'seller' | 'influencer'>('buyer');
  const [referralCode, setReferralCode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const otpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initAuth = useAppStore(s => s.initAuth);
  const globalRefCode = useAppStore(s => s.referralCode);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  useEffect(() => {
    if (globalRefCode && !referralCode) {
      setReferralCode(globalRefCode);
    }
  }, [globalRefCode]);

  useEffect(() => {
    return () => {
      if (otpIntervalRef.current) {
        clearInterval(otpIntervalRef.current);
      }
    };
  }, []);

  // Explicitly render Turnstile when modal opens or tab/mode changes
  useEffect(() => {
    if (isOpen && authMode === 'login' && turnstileRef.current) {
      let attempts = 0;
      const maxAttempts = 10;

      const renderTurnstile = () => {
        // @ts-ignore
        if (window.turnstile) {
          try {
            // Clear existing if any
            if (turnstileWidgetId.current) {
              // @ts-ignore
              window.turnstile.remove(turnstileWidgetId.current);
            }
            // @ts-ignore
            turnstileWidgetId.current = window.turnstile.render(turnstileRef.current!, {
              sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
              theme: 'light',
              size: 'flexible'
            });
          } catch (e) {
            console.error('Turnstile render error:', e);
          }
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(renderTurnstile, 500); // Retry every 500ms
        }
      };

      // Start rendering process
      renderTurnstile();
    }

    return () => {
      // Cleanup on unmount or change
      if (turnstileWidgetId.current) {
        try {
          // @ts-ignore
          if (window.turnstile) window.turnstile.remove(turnstileWidgetId.current);
        } catch (e) {}
        turnstileWidgetId.current = null;
      }
    };
  }, [isOpen, tab, authMode]);

  // Removed client-side rate limiting states (C-07, C-09)
  const [countryCode, setCountryCode] = useState('+91'); // L-02

  if (!isOpen) return null;

  const validateForm = (): string | null => {
    if (loginMethod === 'email') {
      const emailErr = validators.email(email);
      if (emailErr) return emailErr;
      const passErr = validators.password(password);
      if (passErr) return passErr;
    } else {
      if (!phone.trim() || phone.length < 10) return 'Enter a valid 10-digit mobile number';
    }
    if (tab === 'register') {
      const nameErr = validators.name(fullName);
      if (nameErr) return nameErr;
    }
    return null;
  };

  // Input length validation for XSS prevention
  const validateInputLengths = (): boolean => {
    if (email.length > 254) { setError('Email is too long'); return false; }
    if (password.length > 128) { setError('Password is too long'); return false; }
    if (fullName.length > 60) { setError('Name is too long'); return false; }
    if (phone.length > 10) { setError('Phone number is too long'); return false; }
    return true;
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true); setError(null);
    try {
      // L-01: Removed forced re-consent prompt
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin, queryParams: { access_type: 'offline' } },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google login failed.');
      setGoogleLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!phone.trim() || phone.length < 10) { setError('Enter a valid 10-digit mobile number'); return; }
    
    setLoading(true); setError(null);
    try {
      // C-09: Server-side OTP rate limiting
      const rlRes = await fetch('/.netlify/functions/check-rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: `${countryCode}${phone.replace(/\D/g, '')}`, action: 'otp_send' })
      });
      const rlData = await rlRes.json().catch(() => ({}));
      if (!rlRes.ok || !rlData.allowed) {
        throw new Error(rlData.error || 'Too many OTP requests. Please try again later.');
      }

      // Supabase phone OTP — requires phone auth enabled in Supabase dashboard
      const { error } = await supabase.auth.signInWithOtp({ phone: `${countryCode}${phone.replace(/\D/g, '')}` });
      if (error) throw error;
      setOtpSent(true);
      setSuccess(`OTP sent to ${countryCode} ${phone}`);
      
      // Start resend timer (60 seconds)
      setOtpResendTimer(60);
      if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
      otpIntervalRef.current = setInterval(() => {
        setOtpResendTimer(prev => {
          if (prev <= 1) {
            if (otpIntervalRef.current) clearInterval(otpIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      // C-10: Silent failure fix
      setError('Failed to send OTP. Please check your number and try again.');
      setOtpSent(false);
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true); setError(null);
    const phoneId = `${countryCode}${phone.replace(/\D/g, '')}`;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    try {
      // Check rate limit first
      try {
        const rlRes = await fetch('/.netlify/functions/check-rate-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: phoneId, action: 'otp_verify', increment: false })
        });
        const rlData = await rlRes.json().catch(() => ({}));
        if (!rlRes.ok || !rlData.allowed) {
          throw new Error(rlData.error || 'Too many attempts. Please try again later.');
        }
      } catch (rlErr: any) {
        if (isLocalhost) console.warn('[RateLimit] OTP check skipped on localhost');
        else throw rlErr;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneId,
        token: otpCode,
        type: 'sms',
      });
      if (error) {
        // Increment on failure
        await fetch('/.netlify/functions/check-rate-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: phoneId, action: 'otp_verify', increment: true })
        }).catch(() => {});
        throw error;
      }
      initAuth();
      setSuccess('Verified! Logging you in...');
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleVerify2FA = async () => {
    if (!twoFACode.trim() || twoFACode.length !== 6) { setError('Enter the 6-digit code from your authenticator app'); return; }
    setLoading(true); setError(null);
    try {
      // Check rate limit
      const identifier = email || 'anonymous_2fa';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      try {
        const rlRes = await fetch('/.netlify/functions/check-rate-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, action: '2fa_verify', increment: false })
        });
        const rlData = await rlRes.json().catch(() => ({}));
        if (!rlRes.ok || !rlData.allowed) {
          throw new Error(rlData.error || 'Too many attempts. Please try again later.');
        }
      } catch (rlErr: any) {
        if (isLocalhost) console.warn('[RateLimit] 2FA check skipped on localhost');
        else throw rlErr;
      }

      // List factors to get the enrolled TOTP factor
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.all?.find(f => f.factor_type === 'totp');
      
      if (!totpFactor) {
        throw new Error('2FA is not enrolled. Please login with email/password first and set up 2FA in your account settings.');
      }
      
      // Create a challenge
      const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      
      if (!challenge) {
        throw new Error('Failed to create 2FA challenge. Please try again.');
      }
      
      // Verify the TOTP code
      const { error } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: twoFACode,
      });
      
      if (error) {
        // Increment on failure
        await fetch('/.netlify/functions/check-rate-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, action: '2fa_verify', increment: true })
        }).catch(() => {});
        throw new Error('Invalid 2FA code. Please try again.');
      }
      
      setSuccess('2FA verified! Logging you in...');
      initAuth();
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setError(err.message || 'Invalid 2FA code. Please try again.');
    } finally { setLoading(false); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    
    // Validate input lengths to prevent XSS/payload attacks
    if (!validateInputLengths()) { setLoading(false); return; }

    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    
    try {
      // C-06: CAPTCHA check
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const turnstileToken = formData.get('cf-turnstile-response');
      if (!turnstileToken) {
        setError('Please complete the CAPTCHA verification.');
        setLoading(false);
        return;
      }

      // CAPTCHA verification via Netlify function
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const hasKey = !!import.meta.env.VITE_TURNSTILE_SITE_KEY;
      
      let captchaPassed = false;
      
      if (isLocalhost && !hasKey) {
        console.warn('[CAPTCHA] Skipping server-side verification on localhost (no key configured)');
        captchaPassed = true;
      } else {
        try {
          const tsRes = await fetch(`/.netlify/functions/verify-captcha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ response: turnstileToken })
          });
          const tsData = await tsRes.json().catch(() => ({}));
          if (tsRes.ok && tsData.success === true) {
            captchaPassed = true;
          } else {
            setError(tsData.error || 'CAPTCHA verification failed. Please try again.');
          }
        } catch (err) {
          if (isLocalhost) {
            console.warn('[CAPTCHA] Function call failed, skipping on localhost');
            captchaPassed = true;
          } else {
            throw err;
          }
        }
      }

      if (!captchaPassed) {
        setLoading(false);
        // @ts-ignore
        if (window.turnstile) window.turnstile.reset();
        return;
      }

      if (tab === 'register') {
        // C-07: Server-side signup rate limit check
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        try {
          const rlRes = await fetch('/.netlify/functions/check-rate-limit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: email.toLowerCase(), action: 'signup', increment: false })
          });
          const rlData = await rlRes.json().catch(() => ({}));
          if (!rlRes.ok || !rlData.allowed) {
            throw new Error(rlData.error || 'Too many attempts. Please try again later.');
          }
        } catch (err: any) {
          if (isLocalhost) {
            console.warn('[RateLimit] Signup check failed/skipped on localhost');
          } else {
            throw err;
          }
        }

        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email: email.toLowerCase(), 
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: role,
            }
          }
        });
        if (signUpError) {
          // Increment attempts on failure
          await fetch('/.netlify/functions/check-rate-limit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: email.toLowerCase(), action: 'signup', increment: true })
          }).catch(() => {});
          
          if (signUpError.message.toLowerCase().includes('already registered'))
            throw new Error('This email is already registered. Please login instead.');
          throw signUpError;
        }
        if (data.user) {
          // Additional profile setup (wallets) that trigger might not handle
          if (role === 'seller') await supabase.from('sellers').upsert({ id: data.user.id, business_name: `${fullName.trim()}'s Store` });
          else if (role === 'influencer') await supabase.from('influencers').upsert({ id: data.user.id, social_media_links: {}, total_followers: 0 });
          
          // P0-SEC-03: Award referral points SERVER-SIDE (prevents self-awarding exploit)
          if (referralCode.trim() && data.session) {
            fetch(`/.netlify/functions/award-referral-points`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.session.access_token}`,
              },
              body: JSON.stringify({ referralCode: referralCode.trim().toUpperCase(), newUserId: data.user.id }),
            }).catch(() => {}); // Fire-and-forget, non-blocking
          }
          await supabase.from('wallets').upsert({ user_id: data.user.id, balance: 0 });
          const isEmailConfirmed = !!data.user.email_confirmed_at;
          
          if (data.session && isEmailConfirmed) {
            setSuccess('Account created! You are now logged in.');
            // Send welcome email
            sendEmail(email.toLowerCase(), 'welcome', {
              name: fullName.trim(),
              referralCode: data.user.id.slice(0, 8).toUpperCase(),
            });
            initAuth(); setTimeout(onClose, 1200);
          } else {
            if (data.session) {
              await supabase.auth.signOut();
            }
            setSuccess('Account created! Please check your email to confirm, then log in.');
            sendEmail(email.toLowerCase(), 'welcome', {
              name: fullName.trim(),
              referralCode: data.user?.id?.slice(0, 8).toUpperCase(),
            });
          }
        } else { setSuccess('Please check your email to confirm your account.'); }
      } else {
        // C-07: Server-side login lockout — Just CHECK first
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        try {
          const rlRes = await fetch('/.netlify/functions/check-rate-limit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: email.toLowerCase(), action: 'login', increment: false })
          });
          const rlData = await rlRes.json().catch(() => ({}));
          if (!rlRes.ok || !rlData.allowed) {
            throw new Error(rlData.error || 'Too many attempts. Please try again later.');
          }
        } catch (err: any) {
          if (isLocalhost) {
            console.warn('[RateLimit] Login check failed/skipped on localhost');
          } else {
            throw err;
          }
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          // Increment attempts on failure
          await fetch('/.netlify/functions/check-rate-limit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: email.toLowerCase(), action: 'login', increment: true })
          }).catch(() => {}); // Silent catch for rate limit increment
          throw signInError;
        }
        
        if (data.user && !data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error('Please verify your email address before logging in.');
        }

        initAuth(); onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally { setLoading(false); }
  };

  const handleClose = () => {
    setError(null); setSuccess(null); setEmail(''); setPassword(''); setFullName('');
    setReferralCode(''); setPhone(''); setOtpCode(''); setOtpSent(false); setAuthMode('login');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/55 z-[3000] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl w-full max-w-[430px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] px-6 py-5 flex items-center justify-between">
          <div>
            <div className="text-white font-black text-[18px]">
              {authMode === 'otp' ? '📱 Mobile OTP Login' : authMode === '2fa' ? '🔐 Two-Factor Auth' : tab === 'login' ? 'Welcome Back!' : 'Join BYNDIO Free'}
            </div>
            <div className="text-white/75 text-[12px] mt-0.5">
              {authMode === 'otp' ? 'Login with your mobile number' : authMode === '2fa' ? 'Enter the code from your authenticator' : tab === 'login' ? 'Sign in to your account' : 'Create your free account today'}
            </div>
          </div>
          <button onClick={handleClose} className="text-white/80 hover:text-white p-1"><X size={20} /></button>
        </div>

        {/* Tabs — only show for normal login/register */}
        {authMode === 'login' && (
          <div className="flex border-b border-gray-200">
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(null); setSuccess(null); }}
                className={`flex-1 py-3 text-[13px] font-bold transition-colors ${tab === t ? 'text-[#0D47A1] border-b-2 border-[#0D47A1]' : 'text-gray-500 hover:text-gray-700'}`}>
                {t === 'login' ? '🔑 Login' : '✨ Register'}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 md:p-5 flex flex-col gap-3 max-h-[calc(95vh-100px)] overflow-y-auto custom-scrollbar">

          {/* OTP LOGIN SCREEN */}
          {authMode === 'otp' && (
            <>
              {!otpSent ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Mobile Number</label>
                    <div className="flex gap-2">
                      <select 
                        value={countryCode} 
                        onChange={e => setCountryCode(e.target.value)}
                        className="bg-gray-100 border border-gray-300 rounded-md px-2 flex items-center text-[13px] font-bold text-gray-600 outline-none focus:border-[#1565C0]"
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+971">🇦🇪 +971</option>
                      </select>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0,10))}
                        placeholder="10-digit mobile number" maxLength={10}
                        className="flex-1 p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0]" />
                    </div>
                  </div>
                  {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-[12px]"><AlertCircle size={14}/>{error}</div>}
                  {success && <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-700 text-[12px]">✅ {success}</div>}
                  <button onClick={handleSendOTP} disabled={loading}
                    className="w-full bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 text-white p-3 rounded-md text-[14px] font-extrabold transition-colors flex items-center justify-center gap-2">
                    {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Sending...</> : '📱 Send OTP'}
                  </button>
                  <button onClick={() => { setAuthMode('login'); setError(null); setSuccess(null); }} className="text-[12px] text-[#1565C0] font-semibold text-center hover:underline">← Back to email login</button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="bg-[#E3F2FD] rounded-lg p-3 text-[12px] text-[#1565C0]">OTP sent to <strong>{countryCode} {phone}</strong>. Valid for 10 minutes.</div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Enter 6-Digit OTP</label>
                    <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                      placeholder="------" maxLength={6}
                      className="p-2.5 border border-gray-300 rounded-md text-[18px] font-black tracking-[0.5em] text-center outline-none focus:border-[#1565C0]" />
                  </div>
                  {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-[12px]"><AlertCircle size={14}/>{error}</div>}
                  {success && <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-700 text-[12px]">✅ {success}</div>}
                  <button onClick={handleVerifyOTP} disabled={loading}
                    className="w-full bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 text-white p-3 rounded-md text-[14px] font-extrabold transition-colors flex items-center justify-center gap-2">
                    {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Verifying...</> : '✅ Verify OTP'}
                  </button>
                  <button onClick={handleSendOTP} className="text-[12px] text-[#1565C0] font-semibold text-center hover:underline">Resend OTP</button>
                </div>
              )}
            </>
          )}

          {/* 2FA SCREEN */}
          {authMode === '2fa' && (
            <div className="flex flex-col gap-3">
              <div className="bg-[#E8F5E9] rounded-lg p-3 flex gap-2 items-start">
                <Shield size={16} className="text-[#2E7D32] mt-0.5 shrink-0"/>
                <div className="text-[12px] text-[#2E7D32]">Open your authenticator app (Google Authenticator / Authy) and enter the 6-digit code shown for BYNDIO.</div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Authenticator Code</label>
                <input type="text" value={twoFACode} onChange={e => setTwoFACode(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="------" maxLength={6}
                  className="p-2.5 border border-gray-300 rounded-md text-[18px] font-black tracking-[0.5em] text-center outline-none focus:border-[#1565C0]" />
              </div>
              {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-[12px]"><AlertCircle size={14}/>{error}</div>}
              {success && <div className="bg-green-50 border border-green-200 rounded-md p-3 text-green-700 text-[12px]">✅ {success}</div>}
              <button onClick={handleVerify2FA} disabled={loading}
                className="w-full bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 text-white p-3 rounded-md text-[14px] font-extrabold transition-colors flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Verifying...</> : '🔐 Verify Code'}
              </button>
              <button onClick={() => { setAuthMode('login'); setError(null); }} className="text-[12px] text-[#1565C0] font-semibold text-center hover:underline">← Back to login</button>
            </div>
          )}

          {/* NORMAL EMAIL/REGISTER SCREEN */}
          {authMode === 'login' && (
            <>
              {/* Google */}
              <button onClick={handleGoogleLogin} disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-md py-2.5 text-[14px] font-bold text-gray-700 transition-colors disabled:opacity-60">
                {googleLoading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"/> : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </button>

              {/* Mobile OTP button */}
              <button onClick={() => { setAuthMode('otp'); setError(null); setSuccess(null); }}
                className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-[#0D47A1] hover:bg-blue-50 rounded-md py-2.5 text-[14px] font-bold text-gray-700 transition-colors">
                <Phone size={16} className="text-[#0D47A1]"/> Continue with Mobile OTP
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200"/><span className="text-[11px] text-gray-400 font-semibold">OR</span><div className="flex-1 h-px bg-gray-200"/>
              </div>

              <form onSubmit={handleAuth} className="flex flex-col gap-3">
                {tab === 'register' && (
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Full Name</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} 
                      placeholder="Your full name" required autoComplete="name"
                      className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0]"/>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} 
                    placeholder="you@example.com" required autoComplete="email"
                    className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0]"/>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={tab === 'register' ? 'Min 8 chars, 1 uppercase, 1 number' : 'Your password'} 
                      required autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                      className="w-full p-2.5 pr-10 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0]"/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
                    </button>
                  </div>
                </div>
                {tab === 'register' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">I am a...</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([{ val: 'buyer', icon: '🛒', label: 'Buyer' }, { val: 'seller', icon: '🏪', label: 'Seller' }, { val: 'influencer', icon: '⭐', label: 'Creator' }] as const).map(r => (
                          <button key={r.val} type="button" onClick={() => setRole(r.val)}
                            className={`py-3 rounded-md text-[12px] md:text-[13px] font-bold transition-colors border-2 flex flex-col items-center gap-1.5 ${role === r.val ? 'border-[#0D47A1] bg-[#E3F2FD] text-[#0D47A1]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                            <span className="text-xl md:text-2xl">{r.icon}</span>{r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Referral Code (Optional)</label>
                      <input type="text" value={referralCode} onChange={e => setReferralCode(e.target.value)}
                        onBlur={() => setReferralCode(referralCode.toUpperCase())}
                        placeholder="Enter friend's code..."
                        className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0] active:ring-0 uppercase tracking-widest"/>
                    </div>
                  </>
                )}
                {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-[12px]"><AlertCircle size={15} className="shrink-0 mt-0.5"/>{error}</div>}
                {success && <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md p-3 text-green-700 text-[12px]">✅ {success}</div>}
                {/* Cloudflare Turnstile CAPTCHA */}
                <div ref={turnstileRef} className="min-h-[65px]" />

                <button type="submit" disabled={loading}
                  className="w-full bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 rounded-md text-[14px] font-extrabold transition-colors flex items-center justify-center gap-2">
                  {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>{tab === 'login' ? 'Signing in...' : 'Creating account...'}</> : (tab === 'login' ? '🔑 Sign In' : '✨ Create Free Account')}
                </button>

                {/* 2FA link — only show on login */}
                {tab === 'register' && (
                  <>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" required className="mt-0.5 accent-[#1565C0] shrink-0"/>
                      <span className="text-[11px] text-gray-600">
                        I confirm I am 18 years or older and agree to BYNDIO's{' '}
                        <Link to="/legal/terms" target="_blank" className="text-[#1565C0] hover:underline">Terms of Use</Link>
                        {' '}and{' '}
                        <Link to="/legal/privacy" target="_blank" className="text-[#1565C0] hover:underline">Privacy Policy</Link>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="checkbox" required className="mt-0.5 accent-[#1565C0] shrink-0"/>
                      <span className="text-[11px] text-gray-600">
                        I consent to the collection and processing of my personal data as described in the{' '}
                        <Link to="/legal/privacy" target="_blank" className="text-[#1565C0] hover:underline">Privacy Policy</Link>
                        {' '}in accordance with the DPDP Act 2023.
                      </span>
                    </label>
                  </>
                )}
                {tab === 'login' && (
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={() => { setAuthMode('2fa'); setError(null); }}
                      className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-[#0D47A1] font-semibold transition-colors">
                      <Shield size={12}/> Two-Factor Auth
                    </button>
                    <Link to="/forgot-password" onClick={handleClose}
                      className="text-[11px] text-[#1565C0] font-semibold hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                )}

                <p className="text-[11px] text-gray-400 text-center">
                  {tab === 'login'
                    ? <><span>No account? </span><button type="button" onClick={() => setTab('register')} className="text-[#1565C0] font-semibold hover:underline">Register free</button></>
                    : <><span>Already registered? </span><button type="button" onClick={() => setTab('login')} className="text-[#1565C0] font-semibold hover:underline">Sign in</button></>}
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
