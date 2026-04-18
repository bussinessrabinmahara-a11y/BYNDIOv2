import { useState, useEffect, useCallback } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import ProductCard from '../components/ProductCard';

function Countdown({ endsAt }: { endsAt: string }) {
  const calc = useCallback(() => {
    const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, done: diff === 0 };
  }, [endsAt]);
  const [time, setTime] = useState(calc());
  useEffect(() => { const t = setInterval(() => setTime(calc()), 1000); return () => clearInterval(t); }, [calc]);
  if (time.done) return <span className="text-red-600 font-bold text-sm">Sale Ended</span>;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    <div className="flex items-center gap-1">
      {[{ val: pad(time.h), label: 'hrs' }, { val: pad(time.m), label: 'min' }, { val: pad(time.s), label: 'sec' }].map((t, i) => (
        <span key={i} className="flex flex-col items-center">
          <span className="bg-[#E65100] text-white font-black text-[15px] w-9 h-8 flex items-center justify-center rounded">{t.val}</span>
          <span className="text-[9px] text-gray-400 mt-0.5">{t.label}</span>
        </span>
      ))}
    </div>
  );
}

export default function FlashSales() {
  usePageTitle('⚡ Flash Sales');
  const { flashSales, fetchFlashSales, products } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { fetchFlashSales().finally(() => setIsLoading(false)); }, []);
  const flashProducts = flashSales.length > 0
    ? flashSales.map(fs => products.find(p => p.id.toString() === fs.product_id)).filter(Boolean)
    : products.slice(0, 8).map((p, i) => {
        // Stable demo discounts — no Math.random() (causes flicker & different values each render)
        const discounts = [25, 35, 20, 40, 30, 22, 28, 33];
        const discount_pct = discounts[i % discounts.length];
        return {
          ...p,
          flash_sale: {
            discount_pct,
            ends_at: new Date(Date.now() + 3600000 * 6).toISOString(),
            sale_price: Math.round(p.price * (1 - discount_pct / 100)),
          },
        };
      });

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="bg-gradient-to-r from-[#E65100] to-[#BF360C] text-white px-4 py-8 text-center">
        <div className="inline-block bg-white/20 px-4 py-1 rounded-full text-xs font-black mb-3">⚡ LIMITED TIME DEALS</div>
        <h1 className="text-3xl font-black mb-2">Flash Sale</h1>
        <p className="text-[13px] opacity-90 mb-4">Massive discounts. Limited stock. Grab them before they're gone!</p>
        {flashSales[0] && (
          <div className="flex justify-center">
            <div className="bg-black/20 rounded-xl px-5 py-3 inline-flex items-center gap-3">
              <span className="text-sm font-bold opacity-80">Sale ends in:</span>
              <Countdown endsAt={flashSales[0]?.ends_at || new Date(Date.now() + 3600000 * 6).toISOString()} />
            </div>
          </div>
        )}
      </div>
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[16px] font-black flex items-center gap-2">⚡ Today's Flash Deals <span className="bg-[#FFEBEE] text-[#E65100] text-[10px] font-bold px-2 py-0.5 rounded-full">{flashProducts.length} items</span></span>
          <Link to="/products" className="text-[12px] text-[#1565C0] font-semibold hover:underline">All Products →</Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-[10px] h-[280px] animate-pulse" />)}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
              {flashProducts.slice(0, 8).map((p: any) => p && (
                <div key={p.id} className="relative">
                  <div className="absolute top-2 left-2 z-10 bg-[#E65100] text-white text-[10px] font-black px-2 py-0.5 rounded-sm flex items-center gap-1">
                    ⚡ FLASH
                  </div>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
            <div className="bg-[#FFF3E0] border border-[#FFE0B2] rounded-xl p-5 text-center">
              <div className="text-[14px] font-black text-[#E65100] mb-1">🔔 Never Miss a Flash Sale</div>
              <p className="text-[12px] text-gray-600 mb-3">Flash sales are live for 2–6 hours only. Enable notifications to get alerts.</p>
              <button className="bg-[#E65100] text-white px-5 py-2 rounded-md text-[13px] font-bold hover:bg-[#BF360C] transition-colors">Enable Alerts</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
