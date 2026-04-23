import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import LoginModal from './components/LoginModal';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/Toast';
import CookieConsent from './components/CookieConsent';
import { useAppStore } from './store';
import { trackActivity, getVisitorId } from './lib/tracking';
import UniversalPopups from './components/UniversalPopups';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages for code splitting (reduces initial bundle ~60%)
import ScrollToTop from './components/ScrollToTop';

const PageLoader = () => <div className='min-h-[60vh] flex items-center justify-center'><div className='w-8 h-8 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin'/></div>;

const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Seller = lazy(() => import('./pages/Seller'));
const B2B = lazy(() => import('./pages/B2B'));
const Influencer = lazy(() => import('./pages/Influencer'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Admin = lazy(() => import('./pages/Admin'));
const Messages = lazy(() => import('./pages/Messages'));
const MyOrders = lazy(() => import('./pages/MyOrders'));
const CreatorDashboard = lazy(() => import('./pages/CreatorDashboard'));
const CreatorStorefront = lazy(() => import('./pages/CreatorStorefront'));
const Profile = lazy(() => import('./pages/Profile'));
const Affiliate = lazy(() => import('./pages/Affiliate'));
const FlashSales = lazy(() => import('./pages/FlashSales'));
const Returns = lazy(() => import('./pages/Returns'));
const RewardsWallet = lazy(() => import('./pages/RewardsWallet'));
const Compare = lazy(() => import('./pages/Compare'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const SupplierLeads = lazy(() => import('./pages/SupplierLeads'));
const KYC = lazy(() => import('./pages/KYC'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Dropshipping = lazy(() => import('./pages/Dropshipping'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const Gamification = lazy(() => import('./pages/Gamification'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Videos = lazy(() => import('./pages/Videos'));
const B2BQuotes = lazy(() => import('./pages/B2BQuotes'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const About = lazy(() => import('./pages/About'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Legal = lazy(() => import('./pages/Legal'));
const Categories = lazy(() => import('./pages/Categories'));
const Cart = lazy(() => import('./pages/Cart'));
const Pricing = lazy(() => import('./pages/Pricing'));
const SubscriptionCheckout = lazy(() => import('./pages/SubscriptionCheckout'));
const Contact = lazy(() => import('./pages/Contact'));

import MobileBottomNav from './components/MobileBottomNav';

const AppContent = () => {
  const location = useLocation();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const siteSettings = useAppStore(s => s.siteSettings);
  
  useEffect(() => {
    const openLogin = () => setIsLoginOpen(true);
    document.addEventListener('open-login', openLogin);

    // H-14: Referral Tracking with 30-day Expiry
    const params = new URLSearchParams(location.search);
    const cref = params.get('cref') || params.get('ref'); 
    const aref = params.get('aref');
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

    // Helper to get/validate referral from storage
    const getValidReferral = () => {
      const stored = localStorage.getItem('referral');
      if (!stored) return null;
      try {
        const data = JSON.parse(stored);
        if (Date.now() > data.expiry) {
          localStorage.removeItem('referral');
          return null;
        }
        return data;
      } catch {
        localStorage.removeItem('referral');
        return null;
      }
    };

    const existingReferral = getValidReferral();

    if ((cref || aref) && !existingReferral) {
      const code = cref || aref;
      localStorage.setItem('referral', JSON.stringify({ 
        code, 
        referrerId: code, 
        expiry: Date.now() + THIRTY_DAYS 
      }));
      
      trackActivity({ 
        referrer_id: code as string, 
        visitor_id: getVisitorId(), 
        type: 'click', 
        metadata: { source: 'url_param', param: cref ? 'cref' : 'aref' } 
      });
    }

    return () => document.removeEventListener('open-login', openLogin);
  }, [location.search]);

  return (
    <div className="flex flex-col min-h-[100dvh] font-sans text-[#212121]">
      <Navbar onOpenCart={() => setIsCartOpen(true)} onOpenLogin={() => setIsLoginOpen(true)} />
      <main className="flex-1 flex flex-col pt-[44px] md:pt-[64px] pb-[76px] lg:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <Suspense fallback={<PageLoader />}>
            <Routes location={location} key={location.pathname}>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/seller" element={<Seller />} />
            <Route path="/b2b" element={<B2B />} />
            <Route path="/influencer" element={<Influencer />} />
            <Route path="/affiliate" element={<Affiliate />} />
            <Route path="/flash-sales" element={<FlashSales />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/supplier-leads" element={<ProtectedRoute><SupplierLeads /></ProtectedRoute>} />
            <Route path="/kyc" element={<ProtectedRoute><KYC /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/dropshipping" element={<Dropshipping />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/gamification" element={<ProtectedRoute><Gamification /></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
            <Route path="/creator/:creatorId" element={<CreatorStorefront />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/subscription-checkout" element={<ProtectedRoute><SubscriptionCheckout /></ProtectedRoute>} />
            <Route path="/contact" element={<Contact />} />

            {/* Auth required */}
            <Route path="/checkout" element={<ProtectedRoute><ErrorBoundary><Checkout /></ErrorBoundary></ProtectedRoute>} />
            <Route path="/order-success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
            <Route path="/wishlist" element={<Wishlist onOpenLogin={() => setIsLoginOpen(true)} />} />
            <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/returns" element={<ProtectedRoute><Returns /></ProtectedRoute>} />
            <Route path="/rewards" element={<ProtectedRoute><RewardsWallet /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/b2b/quotes" element={<ProtectedRoute><B2BQuotes /></ProtectedRoute>} />

            {/* Role-protected */}
            <Route path="/seller-dashboard" element={<ProtectedRoute requiredRole="seller"><Dashboard /></ProtectedRoute>} />
            <Route path="/creator-dashboard" element={<ProtectedRoute requiredRole="influencer"><CreatorDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
            {/* Public info pages */}
            <Route path="/about" element={<About />} />
            {/* Auth utilities */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Legal pages */}
            <Route path="/legal/:page" element={<Legal />} />
            {/* 404 catch-all */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </main>

      <Footer />
      <MobileBottomNav />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onOpenLogin={() => setIsLoginOpen(true)} />
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <ToastContainer />
      <UniversalPopups />
      <CookieConsent />


    </div>
  );
};

export default function App() {
  const fetchProducts = useAppStore(s => s.fetchProducts);
  const fetchSiteSettings = useAppStore(s => s.fetchSiteSettings);
  const initAuth = useAppStore(s => s.initAuth);
  const isAuthLoading = useAppStore(s => s.isAuthLoading);

  useEffect(() => {
    initAuth();
    fetchProducts();
    fetchSiteSettings();
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="flex flex-col items-center gap-4">
          <div className="text-3xl font-black text-[#0D47A1] tracking-tight">BYNDIO</div>
          <div className="w-8 h-8 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ScrollToTop />
      <AppContent />
    </Router>
  );
}
