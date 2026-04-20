import { Link, useLocation } from 'react-router-dom';
import { Search, PlusCircle, ShoppingBag, User, Home } from 'lucide-react';
import { useAppStore } from '../store';

export default function MobileBottomNav() {
  const loc = useLocation();
  const cart = useAppStore(s => s.cart);
  const cartCount = cart?.length || 0;

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/products', label: 'Explore', icon: Search },
    { href: '/seller', label: 'Create', icon: PlusCircle },
    { href: '/my-orders', label: 'Orders', icon: ShoppingBag, badge: cartCount },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  if (loc.pathname.startsWith('/product/') || loc.pathname.startsWith('/checkout')) {
    return null;
  }

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 flex items-center px-0 pb-[env(safe-area-inset-bottom)] z-[100] h-[56px] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {navItems.map((item) => {
        const isActive = loc.pathname === item.href || (item.href === '/products' && loc.pathname.includes('/product'));
        const Icon = item.icon;
        return (
          <Link key={item.href} to={item.href} className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${isActive ? 'text-[#0D47A1]' : 'text-slate-400 hover:text-slate-900'}`}>
            <div className="relative flex items-center justify-center">
              <Icon size={18} className={isActive ? 'stroke-[2.5]' : 'stroke-[2]'} />
              {!!item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-[#F57C00] text-white text-[7px] font-black px-1 rounded-full ring-2 ring-white">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] tracking-tight ${isActive ? 'font-black' : 'font-bold'} uppercase`}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
