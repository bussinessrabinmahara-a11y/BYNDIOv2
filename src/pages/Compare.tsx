import { useState } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link } from 'react-router-dom';
import { X, Plus } from 'lucide-react';
import { useAppStore, Product } from '../store';
import { toast } from '../components/Toast';

export default function Compare() {
  usePageTitle('Compare Products');
  const { products } = useAppStore();
  const [compareList, setCompareList] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = searchQuery.trim()
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.brand || '').toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : [];

  const addToCompare = (p: Product) => {
    if (compareList.find(c => c.id === p.id)) return;
    if (compareList.length >= 4) { toast('You can compare up to 4 products at a time.', 'info'); return; }
    setCompareList(prev => [...prev, p]);
    setSearchQuery('');
  };

  const removeFromCompare = (id: number | string) => setCompareList(prev => prev.filter(p => p.id !== id));

  const allSpecs = Array.from(new Set(compareList.flatMap(p => p.specs.map(([k]) => k))));

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 px-4 py-2.5 bg-white border-b border-gray-200">
        <Link to="/" className="text-[#1565C0] hover:underline">Home</Link> ›
        <Link to="/products" className="text-[#1565C0] hover:underline">Products</Link> ›
        <span className="font-semibold text-gray-800">Compare Products</span>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <h1 className="text-[18px] font-black mb-4">⚖️ Compare Products</h1>

        {/* Search to add */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-5 relative">
          <div className="text-[13px] font-bold mb-2 text-gray-600">Search and add products to compare (up to 4):</div>
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Type product name or brand..."
            className="w-full p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0]" />
          {filtered.length > 0 && (
            <div className="absolute left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 max-h-[220px] overflow-y-auto">
              {filtered.map(p => (
                <button key={p.id} onClick={() => addToCompare(p)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0">
                  <span className="text-xl">{p.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate">{p.name}</div>
                    <div className="text-[11px] text-gray-400">{p.brand} · {p.cat}</div>
                  </div>
                  <span className="text-[13px] font-black text-[#0D47A1]">₹{p.price.toLocaleString('en-IN')}</span>
                  <Plus size={14} className="text-[#0D47A1] shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {compareList.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center shadow-sm">
            <div className="text-5xl mb-3">⚖️</div>
            <div className="font-black text-[16px] text-gray-700 mb-1">No products selected</div>
            <p className="text-[13px] text-gray-500 max-w-xs mx-auto">Search and add up to 4 products to compare their specs, prices, and ratings side by side.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ minWidth: `${compareList.length * 200 + 140}px` }}>
                <thead>
                  <tr>
                    <td className="p-3 bg-gray-50 border-b border-r border-gray-200 font-bold text-[11px] uppercase text-gray-500 w-[140px]">Feature</td>
                    {compareList.map(p => (
                      <td key={p.id} className="p-3 bg-gray-50 border-b border-r border-gray-100 last:border-r-0 min-w-[180px]">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-[32px] mb-1">{p.icon}</div>
                            <div className="font-bold text-[13px] leading-snug">{p.name}</div>
                            <div className="text-[11px] text-gray-400">{p.brand}</div>
                          </div>
                          <button onClick={() => removeFromCompare(p.id)} className="text-gray-400 hover:text-red-500 transition-colors ml-2">
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Price */}
                  <tr className="border-b border-gray-100">
                    <td className="p-3 bg-gray-50 border-r border-gray-200 font-bold text-[12px] text-gray-600">Price</td>
                    {compareList.map(p => (
                      <td key={p.id} className="p-3 border-r border-gray-100 last:border-r-0">
                        <div className="font-black text-[16px] text-[#0D47A1]">₹{p.price.toLocaleString('en-IN')}</div>
                        <div className="text-[11px] text-gray-400 line-through">₹{p.mrp.toLocaleString('en-IN')}</div>
                      </td>
                    ))}
                  </tr>
                  {/* Discount */}
                  <tr className="border-b border-gray-100 bg-[#E8F5E9]/30">
                    <td className="p-3 bg-gray-50 border-r border-gray-200 font-bold text-[12px] text-gray-600">Discount</td>
                    {compareList.map(p => {
                      const disc = Math.round((1 - p.price / p.mrp) * 100);
                      return (
                        <td key={p.id} className="p-3 border-r border-gray-100 last:border-r-0">
                          <span className="bg-[#388E3C] text-white text-[11px] font-bold px-2 py-0.5 rounded-sm">{disc}% off</span>
                        </td>
                      );
                    })}
                  </tr>
                  {/* Rating */}
                  <tr className="border-b border-gray-100">
                    <td className="p-3 bg-gray-50 border-r border-gray-200 font-bold text-[12px] text-gray-600">Rating</td>
                    {compareList.map(p => (
                      <td key={p.id} className="p-3 border-r border-gray-100 last:border-r-0">
                        <span className="bg-[#388E3C] text-white text-[11px] font-bold px-1.5 py-0.5 rounded-sm">{p.rating} ★</span>
                        <span className="text-[11px] text-gray-400 ml-1">({p.reviews.toLocaleString('en-IN')})</span>
                      </td>
                    ))}
                  </tr>
                  {/* Category */}
                  <tr className="border-b border-gray-100">
                    <td className="p-3 bg-gray-50 border-r border-gray-200 font-bold text-[12px] text-gray-600">Category</td>
                    {compareList.map(p => (
                      <td key={p.id} className="p-3 border-r border-gray-100 last:border-r-0 text-[12px]">{p.cat}</td>
                    ))}
                  </tr>
                  {/* Creator Pick */}
                  <tr className="border-b border-gray-100 bg-[#F3E5F5]/20">
                    <td className="p-3 bg-gray-50 border-r border-gray-200 font-bold text-[12px] text-gray-600">Creator Pick</td>
                    {compareList.map(p => (
                      <td key={p.id} className="p-3 border-r border-gray-100 last:border-r-0 text-[12px]">
                        {p.inf ? <span className="text-[#7B1FA2] font-bold">⭐ {p.creator || 'Yes'}</span> : <span className="text-gray-400">—</span>}
                      </td>
                    ))}
                  </tr>
                  {/* Dynamic specs */}
                  {allSpecs.map(spec => (
                    <tr key={spec} className="border-b border-gray-100">
                      <td className="p-3 bg-gray-50 border-r border-gray-200 font-bold text-[12px] text-gray-600">{spec}</td>
                      {compareList.map(p => {
                        const val = p.specs.find(([k]) => k === spec)?.[1];
                        return <td key={p.id} className="p-3 border-r border-gray-100 last:border-r-0 text-[12px]">{val || '—'}</td>;
                      })}
                    </tr>
                  ))}
                  {/* Add to cart row */}
                  <tr>
                    <td className="p-3 bg-gray-50 border-r border-gray-200 font-bold text-[12px] text-gray-600">Action</td>
                    {compareList.map(p => (
                      <td key={p.id} className="p-3 border-r border-gray-100 last:border-r-0">
                        <Link to={`/product/${p.id}`} className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-3 py-1.5 rounded text-[11px] font-bold transition-colors inline-block">
                          View Product
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {compareList.length > 0 && (
          <button onClick={() => setCompareList([])} className="mt-4 text-[12px] text-red-500 hover:underline font-semibold">
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
