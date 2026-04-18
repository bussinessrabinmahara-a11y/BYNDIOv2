import { ReactNode } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAppStore } from '../store';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'buyer' | 'seller' | 'influencer' | 'admin';
  requireAuth?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  requireAuth = true,
}: ProtectedRouteProps) {
  const user = useAppStore(state => state.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);

  // Show spinner while auth is resolving
  if (isAuthLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  // Not logged in: Show "Login Required" state with action button
  if (requireAuth && !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-blue-50 text-[#0D47A1] rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">Login Required</h2>
        <p className="text-gray-500 font-medium mb-8 max-w-sm leading-relaxed">
          Please log in to your account to complete your purchase or access member-only features.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          <button 
            onClick={() => {
              document.dispatchEvent(new CustomEvent('open-login'));
            }}
            className="flex-1 bg-black text-white py-3.5 rounded-2xl font-black shadow-lg hover:scale-105 transition-all"
          >
            Login Now
          </button>
          <Link to="/" className="flex-1 bg-gray-50 text-gray-600 py-3.5 rounded-2xl font-black border border-gray-100 hover:bg-white transition-all text-center">
            Browse Site
          </Link>
        </div>
      </div>
    );
  }

  // Banned users are blocked from everything
  if (user?.role === ('banned' as any)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <span className="text-6xl mb-4">🚫</span>
        <h2 className="text-xl font-black mb-2">Account Suspended</h2>
        <p className="text-gray-500 mb-5 max-w-xs">
          Your account has been suspended. If you believe this is a mistake, contact{' '}
          <a href="mailto:grievance@byndio.in" className="text-[#1565C0] underline">grievance@byndio.in</a>.
        </p>
      </div>
    );
  }

  // Role check: admin can access ALL protected pages
  // Other roles must match exactly
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <span className="text-6xl mb-4">🚫</span>
        <h2 className="text-xl font-black mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-5 max-w-xs">
          This page requires the <strong>{requiredRole}</strong> role.
          {user ? ` You are logged in as a ${user.role}.` : ''}
        </p>
        <Link to="/" className="bg-[#0D47A1] text-white px-5 py-2 rounded-md font-bold text-sm hover:bg-[#1565C0] transition-colors">
          Go Home
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
