import { useState, useEffect } from 'react';
import { Truck, Package, RefreshCw, BarChart2, Zap, Globe, CheckCircle, ArrowRight, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { toast, toastSuccess } from '../components/Toast';

const steps = [
  { icon: Globe, title: 'Browse Suppliers', desc: 'Find verified suppliers across categories with real-time inventory' },
  { icon: Package, title: 'Import Products', desc: 'One-click import to your store. Auto-sync pricing and stock' },
  { icon: Zap, title: 'Auto Order Forward', desc: 'When a buyer orders, it auto-routes to supplier for fulfillment' },
  { icon: Truck, title: 'Track Shipment', desc: 'Real-time tracking updates sent to both you and buyer automatically' },
];

export default function Dropshipping() {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'suppliers' | 'my_products' | 'orders' | 'settings'>('overview');
  const [importingId, setImportingId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [settings, setSettings] = useState({
    autoOrderForwarding: false,
    autoInventorySync: false,
    autoMarginCalc: true,
    trackingNotifications: true,
  });
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    // Load verified sellers as dropshipping suppliers
    (supabase
      .from('sellers')
      .select('id, business_name, category, kyc_status, is_verified, created_at')
      .eq('is_verified', true)
      .limit(20) as any)
      .then(({ data }: any) => {
        if (data && data.length > 0) {
          setSuppliers(data.map((s: any, i: number) => ({
            id: s.id,
            name: s.business_name || 'Verified Supplier',
            category: s.category || 'General',
            badge: s.kyc_status === 'verified' ? '✅ Verified' : '🔄 Pending KYC',
            rating: 4.5 + (i % 4) * 0.1,
            moq: 5 + (i % 4) * 5,
            margin: '20-40%',
          })));
        } else {
          setSuppliers([]);
        }
      })
      .finally(() => setLoadingSuppliers(false));
  }, []);

  const handleImport = async (supplierId: string) => {
    if (!user) { toast('Login required to import supplier catalog.', 'error'); return; }
    setImportingId(supplierId);
    try {
      // Fetch products from this supplier and clone them for the dropshipper
      const { data: supplierProducts, error } = await supabase
        .from('products')
        .select('name, description, price, mrp, category, images')
        .eq('seller_id', supplierId)
        .eq('is_active', true)
        .limit(10);

      if (error) throw error;

      if (!supplierProducts || supplierProducts.length === 0) {
        toast('This supplier has no active products yet.', 'info');
        return;
      }

      // Insert copies under the dropshipper's seller account
      const toInsert = supplierProducts.map(p => ({
        seller_id: user.id,
        name: p.name,
        description: p.description,
        price: Math.round(p.price * 1.15), // 15% margin
        mrp: p.mrp,
        category: p.category,
        images: p.images,
        is_active: true,
        stock_quantity: 999, // dropshipping = no stock limit
        is_dropship: true,
        dropship_supplier_id: supplierId,
      }));

      const { error: insertError } = await supabase.from('products').insert(toInsert);
      if (insertError) throw insertError;

      toastSuccess(`${supplierProducts.length} products imported to your store with 15% margin!`);
    } catch (err: any) {
      toast(err.message || 'Import failed. Please try again.', 'error');
    } finally {
      setImportingId(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) { toast('Please login to save settings.', 'error'); return; }
    setSavingSettings(true);
    try {
      const { error } = await supabase.from('sellers').upsert({
        id: user.id,
        dropship_settings: settings,
        supplier_api_key: apiKey || null,
        supplier_api_secret: apiSecret || null,
      }, { onConflict: 'id' });
      if (error) throw error;
      toastSuccess('Dropshipping settings saved!');
    } catch (err: any) {
      toast('Failed to save settings: ' + err.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const navItems = [
    { id: 'overview', icon: BarChart2, label: 'Overview' },
    { id: 'suppliers', icon: Globe, label: 'Suppliers' },
    { id: 'my_products', icon: Package, label: 'My Products' },
    { id: 'orders', icon: Truck, label: 'Orders' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] text-white py-12 px-6 text-center">
        <div className="text-4xl font-black mb-2">Byndio Express 🚚</div>
        <div className="text-[15px] opacity-90 max-w-xl mx-auto mb-5">
          Start dropshipping without inventory. Source from 500+ verified suppliers, auto-forward orders, track shipments.
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          {[
            { icon: '🏭', label: '500+ Suppliers' },
            { icon: '📦', label: '50,000+ Products' },
            { icon: '⚡', label: 'Auto Order Routing' },
            { icon: '🚀', label: 'Zero Inventory Risk' },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-[13px] font-semibold">
              {s.icon} {s.label}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-bold whitespace-nowrap transition-colors ${activeTab === item.id ? 'bg-[#1B5E20] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                <Icon size={15} />{item.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' && (
          <div className="flex flex-col gap-5">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: '🛍️', label: 'Products Listed', value: '0', sub: 'Import from suppliers' },
                { icon: '📦', label: 'Orders Forwarded', value: '0', sub: 'Auto-routed today' },
                { icon: '💰', label: 'Margin Earned', value: '₹0', sub: 'This month' },
                { icon: '🚚', label: 'In Transit', value: '0', sub: 'Active shipments' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-[22px] font-black">{s.value}</div>
                  <div className="text-[11px] text-gray-500">{s.label}</div>
                  <div className="text-[10px] text-[#388E3C] font-semibold">{s.sub}</div>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <div className="text-[16px] font-black mb-4">How Byndio Express Works</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={i} className="flex flex-col items-center text-center gap-2">
                      <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] flex items-center justify-center">
                        <Icon size={22} className="text-[#2E7D32]" />
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#2E7D32] text-white text-[12px] font-black flex items-center justify-center -mt-1">{i + 1}</div>
                      <div className="text-[13px] font-black">{step.title}</div>
                      <div className="text-[11px] text-gray-500">{step.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* API Notice */}
            <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-xl p-4">
              <div className="flex gap-3 items-start">
                <RefreshCw size={18} className="text-[#1565C0] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[13px] font-black text-[#0D47A1] mb-1">Supplier API Integration</div>
                  <div className="text-[12px] text-[#1565C0]">
                    Full automated supplier API integration (inventory sync, auto-order forwarding, real-time tracking) is available in the <strong>Byndio Express Pro plan</strong>. Connect your supplier API keys in Settings to enable live sync.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="flex flex-col gap-3">
            <div className="text-[16px] font-black mb-1">Browse Verified Suppliers</div>
            {loadingSuppliers ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400">Loading suppliers...</div>
            ) : suppliers.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400">No verified suppliers found</div>
            ) : (
              suppliers.map(s => (
                <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-2xl shrink-0">🏭</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-[14px] font-black">{s.business_name || 'Supplier'}</div>
                      {s.is_verified && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32]">Verified</span>}
                      {s.kyc_status === 'approved' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#1565C0]">KYC Approved</span>}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {s.category || 'General'} • ID: {s.id?.slice(0, 8)}
                    </div>
                  </div>
                  <button onClick={() => handleImport(s.id)} disabled={importingId === s.id}
                    className="bg-[#1B5E20] hover:bg-[#2E7D32] disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-[12px] font-bold transition-colors shrink-0">
                    {importingId === s.id ? '⏳ Importing...' : '📥 Import Catalog'}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {(activeTab === 'my_products' || activeTab === 'orders') && (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">{activeTab === 'my_products' ? '📦' : '🚚'}</div>
            <div className="text-[16px] font-black text-[#1B5E20] mb-2">
              {activeTab === 'my_products' ? 'No Dropship Products Yet' : 'No Forwarded Orders Yet'}
            </div>
            <p className="text-gray-500 text-[13px] mb-4">
              {activeTab === 'my_products'
                ? 'Import products from our supplier catalog to start dropshipping with zero inventory.'
                : 'Orders placed on your dropship products will appear here and auto-forward to suppliers.'}
            </p>
            <button onClick={() => setActiveTab('suppliers')} className="bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-6 py-2.5 rounded-md font-bold text-[13px] transition-colors">
              Browse Suppliers →
            </button>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-[16px] font-black mb-4">⚙️ Dropshipping Settings</div>
            <div className="flex flex-col gap-4">
              {[
                { key: 'autoOrderForwarding', label: 'Auto Order Forwarding', desc: 'Automatically forward orders to supplier when placed' },
                { key: 'autoInventorySync', label: 'Auto Inventory Sync', desc: 'Sync supplier stock levels every 30 minutes' },
                { key: 'autoMarginCalc', label: 'Auto Margin Calculation', desc: 'Auto-set your selling price based on supplier cost + target margin' },
                { key: 'trackingNotifications', label: 'Tracking Notifications', desc: 'Send buyers automatic shipment tracking updates' },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-[13px] font-bold">{setting.label}</div>
                    <div className="text-[11px] text-gray-500">{setting.desc}</div>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, [setting.key]: !prev[setting.key as keyof typeof prev] }))}
                    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors cursor-pointer ${settings[setting.key as keyof typeof settings] ? 'bg-[#2E7D32]' : 'bg-gray-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[setting.key as keyof typeof settings] ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-4">
                <div className="text-[13px] font-black mb-3">Supplier API Keys</div>
                <div className="flex flex-col gap-2">
                  <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Supplier API Key" className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#2E7D32]" />
                  <input value={apiSecret} onChange={e => setApiSecret(e.target.value)} placeholder="Supplier API Secret" type="password" className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#2E7D32]" />
                  <button onClick={handleSaveSettings} disabled={savingSettings} className="bg-[#1B5E20] hover:bg-[#2E7D32] disabled:bg-gray-400 text-white py-2.5 rounded-md text-[13px] font-bold transition-colors">
                    {savingSettings ? 'Saving...' : 'Save API Configuration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
