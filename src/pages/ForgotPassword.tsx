import { useState } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  usePageTitle('Forgot Password');
  const [email, setEmail]       = useState('');
  const [sent, setSent]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address'); return; }
    setLoading(true); setError('');
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-[420px] overflow-hidden">
        <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] px-6 py-6 text-white">
          <div className="text-xl font-black mb-1">🔐 Forgot Password</div>
          <div className="text-white/75 text-[13px]">We'll send you a reset link</div>
        </div>

        <div className="p-6">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={52} className="text-[#388E3C] mx-auto mb-4"/>
              <h2 className="text-[17px] font-black mb-2 text-[#2E7D32]">Check Your Email!</h2>
              <p className="text-[13px] text-gray-600 mb-4">
                We've sent a password reset link to <strong>{email}</strong>.<br/>
                Click the link in the email to reset your password.
              </p>
              <p className="text-[12px] text-gray-400 mb-5">
                Didn't receive it? Check your spam folder, or try again in a few minutes.
              </p>
              <button onClick={() => { setSent(false); setEmail(''); }}
                className="text-[#1565C0] text-[13px] font-semibold hover:underline">
                Try a different email →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-[13px] text-gray-600">
                Enter the email address associated with your BYNDIO account and we'll send you a link to reset your password.
              </p>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input
                    type="email" value={email}
                    onChange={e => { setEmail(e.target.value); setError(''); }}
                    placeholder="you@example.com" required
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0]"
                  />
                </div>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-[12px]">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 text-white py-3 rounded-md font-black text-[14px] transition-colors flex items-center justify-center gap-2">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Sending…</>
                  : '📧 Send Reset Link'}
              </button>
              <Link to="/" className="flex items-center justify-center gap-1.5 text-[12px] text-gray-500 hover:text-[#0D47A1] font-semibold">
                <ArrowLeft size={13}/> Back to Login
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
