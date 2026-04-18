import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { validators } from '../lib/validators';

export default function ResetPassword() {
  const navigate               = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setValidSession(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pwErr = validators.password(password);
    if (pwErr) { setError(pwErr); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setLoading(true); setError('');
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-[420px] overflow-hidden">
        <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] px-6 py-6 text-white">
          <div className="text-xl font-black mb-1">🔐 Reset Password</div>
          <div className="text-white/75 text-[13px]">Choose a strong new password</div>
        </div>
        <div className="p-6">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle size={52} className="text-[#388E3C] mx-auto mb-4"/>
              <h2 className="text-[17px] font-black mb-2 text-[#2E7D32]">Password Updated!</h2>
              <p className="text-[13px] text-gray-600">Your password has been reset successfully. Redirecting you to login…</p>
            </div>
          ) : !validSession ? (
            <div className="text-center py-6 text-gray-500 text-[14px]">
              <p className="mb-3">Invalid or expired reset link.</p>
              <Link to="/forgot-password" className="text-[#1565C0] font-bold hover:underline">Request a new reset link →</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">New Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Min 8 chars, 1 uppercase, 1 number" required
                    className="w-full pr-10 p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0]"/>
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Confirm Password</label>
                <input type="password" value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(''); }}
                  placeholder="Repeat your new password" required
                  className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0]"/>
              </div>
              <ul className="text-[11px] text-gray-400 flex flex-col gap-1 pl-2">
                <li className={password.length >= 8 ? 'text-[#388E3C]' : ''}>✓ At least 8 characters</li>
                <li className={/[A-Z]/.test(password) ? 'text-[#388E3C]' : ''}>✓ One uppercase letter</li>
                <li className={/[0-9]/.test(password) ? 'text-[#388E3C]' : ''}>✓ One number</li>
                <li className={password && password === confirm ? 'text-[#388E3C]' : ''}>✓ Passwords match</li>
              </ul>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-700 text-[12px]">{error}</div>
              )}
              <button type="submit" disabled={loading}
                className="w-full bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 text-white py-3 rounded-md font-black text-[14px] transition-colors flex items-center justify-center gap-2">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Updating…</>
                  : '🔐 Set New Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
