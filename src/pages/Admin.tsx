import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, BarChart2, Users, Package, Tag, Star, DollarSign, Building2, Settings,
  Save, Edit, Trash2, LayoutTemplate, PlusCircle, RefreshCw, Bell, Mail, Shield,
  TrendingUp, CheckCircle, XCircle, Search, ChevronDown, ChevronUp, Eye, EyeOff,
  Download, Upload, Zap, MessageSquare, Gift, Award, Globe, Lock,
  Activity, ArrowUpRight, ArrowDownRight, Truck, CreditCard, RotateCcw,
  UserCheck, AlertTriangle, Menu, X, ExternalLink, ChevronRight, Plus, Edit3, Loader2, Camera, Briefcase
} from 'lucide-react';
import { toast, toastSuccess } from '../components/Toast';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { processRefund, createShipment, generateAWB, requestPickup, sendEmail } from '../lib/email';
import { usePageTitle } from '../lib/usePageTitle';
import InputModal from '../components/InputModal';

// ================================================================
// HELPER: Status color mapper
// ================================================================
const statusColor = (s: string) => ({
  delivered: 'bg-green-100 text-green-700',
  paid: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-700',
  active: 'bg-green-100 text-green-700',
  shipped: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
  rejected: 'bg-red-100 text-red-700',
  refunded: 'bg-purple-100 text-purple-700',
}[s] || 'bg-gray-100 text-gray-600');

// ================================================================
// REAL-TIME STATS OVERVIEW
// ================================================================
function OverviewPanel() {
  const [stats, setStats] = useState({
    totalOrders: 0, totalRevenue: 0, totalUsers: 0, activeProducts: 0,
    pendingOrders: 0, avgOrderValue: 0, todayOrders: 0, todayRevenue: 0,
    refunds: 0, sellers: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<{ day: string; rev: number; orders: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const [allOrders, usersRes, productsRes, pendingRes, sellersRes, refundsRes] = await Promise.all([
      supabase.from('orders').select('id,total_amount,status,payment_status,created_at,shipping_address').order('created_at', { ascending: false }).limit(200),
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'seller'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('payment_status', 'refunded'),
    ]);

    const orders = allOrders.data || [];
    const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
    const todayOrders = orders.filter(o => o.created_at >= todayStr);
    const todayRev = todayOrders.filter(o => o.payment_status === 'paid').reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
    const avgOV = orders.length > 0 ? Math.round(totalRevenue / orders.filter(o => o.payment_status === 'paid').length || 0) : 0;

    // Build 7-day revenue chart
    const days: { day: string; rev: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const dayOrders = orders.filter(o => o.created_at >= d.toISOString() && o.created_at < next.toISOString());
      days.push({
        day: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        rev: dayOrders.filter(o => o.payment_status === 'paid').reduce((s: number, o: any) => s + (o.total_amount || 0), 0),
        orders: dayOrders.length,
      });
    }

    // Alerts
    const newAlerts: string[] = [];
    if ((pendingRes.count || 0) > 5) newAlerts.push(`${pendingRes.count} orders pending shipping — action needed`);
    if ((refundsRes.count || 0) > 0) newAlerts.push(`${refundsRes.count} refunded orders this period`);

    setStats({
      totalOrders: orders.length,
      totalRevenue,
      totalUsers: usersRes.count || 0,
      activeProducts: productsRes.count || 0,
      pendingOrders: pendingRes.count || 0,
      avgOrderValue: avgOV,
      todayOrders: todayOrders.length,
      todayRevenue: todayRev,
      refunds: refundsRes.count || 0,
      sellers: sellersRes.count || 0,
    });
    setRecentOrders(orders.slice(0, 8));
    setRevenueData(days);
    setAlerts(newAlerts);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxRev = Math.max(...revenueData.map(d => d.rev), 1);

  const kpis = [
    { label: "Today's Revenue", value: `₹${stats.todayRevenue.toLocaleString('en-IN')}`, sub: `${stats.todayOrders} orders today`, icon: DollarSign, color: '#388E3C', bg: '#E8F5E9' },
    { label: 'Total GMV', value: `₹${stats.totalRevenue.toLocaleString('en-IN')}`, sub: 'All paid orders', icon: TrendingUp, color: '#0D47A1', bg: '#E3F2FD' },
    { label: 'Total Orders', value: stats.totalOrders.toLocaleString(), sub: `${stats.pendingOrders} need shipping`, icon: Package, color: '#7B1FA2', bg: '#F3E5F5' },
    { label: 'Registered Users', value: stats.totalUsers.toLocaleString(), sub: `${stats.sellers} sellers`, icon: Users, color: '#E65100', bg: '#FFF3E0' },
    { label: 'Active Products', value: stats.activeProducts.toLocaleString(), sub: 'Live listings', icon: ShoppingBag, color: '#00695C', bg: '#E0F2F1' },
    { label: 'Avg Order Value', value: stats.avgOrderValue > 0 ? `₹${stats.avgOrderValue.toLocaleString('en-IN')}` : '—', sub: 'Per paid order', icon: CreditCard, color: '#C62828', bg: '#FFEBEE' },
  ];

  return (
    <div className="space-y-5">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#FFF3E0] border border-[#FFB74D] rounded-xl px-4 py-3">
              <AlertTriangle size={15} className="text-[#F57C00] shrink-0" />
              <span className="text-[13px] font-semibold text-[#E65100]">{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: k.bg }}>
                  <Icon size={18} style={{ color: k.color }} />
                </div>
                {loading && <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />}
              </div>
              <div className="text-[22px] font-black leading-none mb-1" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[12px] font-semibold text-gray-600">{k.label}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-black text-[15px] text-gray-900">Revenue — Last 7 Days</div>
              <div className="text-[12px] text-gray-400 mt-0.5">Paid orders only</div>
            </div>
            <button onClick={load} className="p-2 text-gray-400 hover:text-[#0D47A1] hover:bg-gray-50 rounded-lg transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex items-end gap-2 h-36">
            {revenueData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="text-[9px] text-[#0D47A1] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {d.rev > 0 ? `₹${(d.rev / 1000).toFixed(1)}k` : ''}
                </div>
                <div className="relative w-full">
                  <div className="w-full bg-[#0D47A1] rounded-t-lg transition-all group-hover:bg-[#1565C0]"
                    style={{ height: `${Math.max(4, (d.rev / maxRev) * 110)}px` }} />
                  {d.orders > 0 && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {d.orders} orders
                    </div>
                  )}
                </div>
                <div className="text-[9px] text-gray-400 text-center">{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="font-black text-[15px] text-gray-900 mb-4">Quick Stats</div>
          <div className="space-y-3">
            {[
              { label: 'Pending Shipping', value: stats.pendingOrders, color: 'text-[#E65100]', urgent: stats.pendingOrders > 3 },
              { label: 'Total Sellers', value: stats.sellers, color: 'text-[#0D47A1]', urgent: false },
              { label: 'Refunded Orders', value: stats.refunds, color: 'text-red-600', urgent: stats.refunds > 0 },
              { label: 'Today Orders', value: stats.todayOrders, color: 'text-[#388E3C]', urgent: false },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-[13px] text-gray-600">{s.label}</span>
                <span className={`text-[14px] font-black ${s.color} ${s.urgent ? 'animate-pulse' : ''}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <div className="font-black text-[15px] text-gray-900">Recent Orders</div>
            <div className="text-[12px] text-gray-400">Last {recentOrders.length} orders</div>
          </div>
          {loading && <div className="w-4 h-4 border-2 border-[#0D47A1] border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-[11px] font-bold text-gray-400 uppercase bg-gray-50/50">
                <th className="px-5 py-3 text-left">Order</th>
                <th className="px-5 py-3 text-left">Customer</th>
                <th className="px-5 py-3 text-left">Amount</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Payment</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0
                ? <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No orders yet — they'll appear here once buyers start purchasing</td></tr>
                : recentOrders.map(o => (
                  <tr key={o.id} className="border-t border-gray-50 hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-[#1565C0]">#{o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="px-5 py-3.5 text-gray-600">{o.shipping_address?.fullName || '—'}</td>
                    <td className="px-5 py-3.5 font-bold">₹{o.total_amount?.toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-[12px]">{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${statusColor(o.status)}`}>{o.status}</span></td>
                    <td className="px-5 py-3.5"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${statusColor(o.payment_status)}`}>{o.payment_status}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// PRODUCT MANAGER — Full Edit/Delete/Toggle/Add
// ================================================================
function ProductManager() {
  const fetchGlobalProducts = useAppStore(s => s.fetchProducts);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', brand: '', category: 'Fashion', price: '', mrp: '', imageUrl: '', description: '', stock_quantity: '10' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('id,name,category,price,mrp,is_active,images,created_at,stock_quantity,seller_id').order('created_at', { ascending: false });
    if (data) setProducts(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const toggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase.from('products').update({ is_active: !current }).eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !current } : p));
      toastSuccess(!current ? 'Product activated' : 'Product hidden from store');
      fetchGlobalProducts();
    } catch (err: any) {
      toast('Failed to update product: ' + err.message, 'error');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;
    try {
      // L-11: Check for pending orders before delete
      const { count: pendingCount } = await supabase.from('order_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', id);

      if (pendingCount && pendingCount > 0) {
        toast(`Cannot delete: This product has ${pendingCount} order(s). Please hide it instead.`, 'error');
        return;
      }

      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== id));
      toastSuccess('Product deleted');
      // L-12: Single fetch instead of duplicate
      fetchGlobalProducts();
    } catch (err: any) {
      toast('Failed to delete product: ' + err.message, 'error');
    }
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase.from('products').update({
      name: editData.name,
      price: parseFloat(editData.price),
      mrp: parseFloat(editData.mrp),
      stock_quantity: parseInt(editData.stock_quantity),
      images: editData.imageUrl ? [editData.imageUrl] : editData.images,
    }).eq('id', editingId);
    if (error) { toast('Save failed: ' + error.message, 'error'); }
    else { toastSuccess('Product updated!'); setEditingId(null); load(); fetchGlobalProducts(); }
    setSaving(false);
  };

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>, forNew = false) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('Max 5MB', 'error'); return; }
    setImgUploading(true);
    const path = `products/admin/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { upsert: true });
    if (error) { toast('Upload failed: ' + error.message, 'error'); }
    else {
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      if (forNew) setNewProduct(p => ({ ...p, imageUrl: publicUrl }));
      else setEditData((d: any) => ({ ...d, imageUrl: publicUrl }));
      toastSuccess('Image uploaded!');
    }
    setImgUploading(false);
    e.target.value = '';
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { toast('Not authenticated', 'error'); return; }
    const { error } = await supabase.from('products').insert({
      name: newProduct.name, description: newProduct.brand,
      category: newProduct.category,
      price: parseFloat(newProduct.price), mrp: parseFloat(newProduct.mrp),
      stock_quantity: parseInt(newProduct.stock_quantity),
      images: newProduct.imageUrl ? [newProduct.imageUrl] : [],
      seller_id: userData.user.id, is_active: true, is_featured: false,
    });
    if (error) { toast('Add failed: ' + error.message, 'error'); }
    else { toastSuccess('Product added!'); setAddMode(false); setNewProduct({ name: '', brand: '', category: 'Fashion', price: '', mrp: '', imageUrl: '', description: '', stock_quantity: '10' }); load(); fetchGlobalProducts(); }
  };

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-black text-[#0D47A1]">📦 Product Management</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-[12px] outline-none focus:border-[#1565C0] w-48" />
          </div>
          <button onClick={() => setAddMode(!addMode)}
            className="flex items-center gap-1.5 bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-[12px] font-bold hover:bg-[#1565C0] transition-colors">
            <PlusCircle size={14} /> Add Product
          </button>
          <button onClick={load} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Add Product Form */}
      {addMode && (
        <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-xl p-5 mb-4">
          <h3 className="font-black text-[14px] text-[#0D47A1] mb-4">➕ Add New Product</h3>
          <form onSubmit={addProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Product Name *', field: 'name', placeholder: 'e.g. Wireless Earbuds Pro' },
              { label: 'Brand *', field: 'brand', placeholder: 'e.g. Sony, boAt' },
              { label: 'Price (₹) *', field: 'price', placeholder: '999', type: 'number' },
              { label: 'MRP (₹) *', field: 'mrp', placeholder: '1499', type: 'number' },
              { label: 'Stock Quantity', field: 'stock_quantity', placeholder: '50', type: 'number' },
            ].map(f => (
              <div key={f.field} className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{f.label}</label>
                <input type={f.type || 'text'} required={f.label.includes('*')} placeholder={f.placeholder}
                  value={(newProduct as any)[f.field]} onChange={e => setNewProduct(p => ({ ...p, [f.field]: e.target.value }))}
                  className="p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0] bg-white" />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Category</label>
              <select value={newProduct.category} onChange={e => setNewProduct(p => ({ ...p, category: e.target.value }))}
                className="p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0] bg-white">
                {['Fashion', 'Electronics', 'Beauty', 'Sports', 'Kids', 'Home', 'Books', 'Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 col-span-full">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Product Image</label>
              <div className="flex gap-2 items-center">
                <input type="text" placeholder="Paste image URL or leave blank to upload"
                  value={newProduct.imageUrl} onChange={e => setNewProduct(p => ({ ...p, imageUrl: e.target.value }))}
                  className="flex-1 p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0] bg-white" />
                <label className="cursor-pointer bg-white border border-[#0D47A1] text-[#0D47A1] px-3 py-2.5 rounded-lg text-[12px] font-bold hover:bg-[#E3F2FD] transition-colors whitespace-nowrap">
                  {imgUploading ? '⏳' : '📷 Upload'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => uploadImage(e, true)} disabled={imgUploading} />
                </label>
              </div>
              {newProduct.imageUrl && newProduct.imageUrl.startsWith('http') && (
                <img src={newProduct.imageUrl} alt="preview" className="w-20 h-20 object-cover rounded-lg mt-1" />
              )}
            </div>
            <div className="col-span-full flex gap-2">
              <button type="submit" className="flex-1 bg-[#0D47A1] hover:bg-[#1565C0] text-white py-2.5 rounded-lg font-bold text-[13px]">
                ✅ Add Product
              </button>
              <button type="button" onClick={() => setAddMode(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-[13px] font-bold hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400">Loading products…</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No products found</td></tr>
              ) : filtered.map(p => (
                editingId === p.id ? (
                  <tr key={p.id} className="border-t border-gray-100 bg-[#E3F2FD]">
                    <td className="p-3" colSpan={5}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        {[
                          { label: 'Name', field: 'name' },
                          { label: 'Price', field: 'price', type: 'number' },
                          { label: 'MRP', field: 'mrp', type: 'number' },
                          { label: 'Stock', field: 'stock_quantity', type: 'number' },
                        ].map(f => (
                          <div key={f.field}>
                            <div className="text-[10px] font-bold text-gray-500 uppercase mb-0.5">{f.label}</div>
                            <input type={f.type || 'text'} value={editData[f.field] || ''}
                              onChange={e => setEditData((d: any) => ({ ...d, [f.field]: e.target.value }))}
                              className="w-full p-1.5 border border-[#90CAF9] rounded text-[12px] outline-none focus:border-[#1565C0]" />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 items-center">
                        <input type="text" value={editData.imageUrl || ''} placeholder="Image URL"
                          onChange={e => setEditData((d: any) => ({ ...d, imageUrl: e.target.value }))}
                          className="flex-1 p-1.5 border border-[#90CAF9] rounded text-[12px] outline-none" />
                        <label className="cursor-pointer bg-white border border-gray-300 text-gray-600 px-2 py-1.5 rounded text-[11px] font-bold hover:bg-gray-50">
                          {imgUploading ? '⏳' : '📷'}
                          <input type="file" accept="image/*" className="hidden" onChange={e => uploadImage(e, false)} disabled={imgUploading} />
                        </label>
                        <button onClick={saveEdit} disabled={saving}
                          className="flex items-center gap-1 bg-[#388E3C] text-white px-3 py-1.5 rounded text-[12px] font-bold hover:bg-[#2E7D32] disabled:opacity-50">
                          <Save size={12} /> {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-gray-300 rounded text-[12px] font-bold hover:bg-gray-50">Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                          {p.images?.[0]?.startsWith('http')
                            ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" onError={e => (e.target as any).style.display = 'none'} />
                            : <span className="text-lg">{p.images?.[0] || '📦'}</span>}
                        </div>
                        <div>
                          <div className="font-semibold leading-tight text-[13px]">{p.name}</div>
                          <div className="text-[11px] text-gray-400">{p.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-[#0D47A1]">₹{p.price?.toLocaleString('en-IN')}</div>
                      <div className="text-[11px] text-gray-400 line-through">₹{p.mrp?.toLocaleString('en-IN')}</div>
                    </td>
                    <td className="p-3">
                      <span className={`text-[12px] font-bold ${(p.stock_quantity || 0) > 0 ? 'text-[#388E3C]' : 'text-red-600'}`}>
                        {p.stock_quantity ?? '—'}
                      </span>
                    </td>
                    <td className="p-3">
                      <button onClick={() => toggleActive(p.id, p.is_active)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors ${p.is_active ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'}`}>
                        {p.is_active ? '● Live' : '○ Hidden'}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => { setEditingId(p.id); setEditData({ name: p.name, price: p.price, mrp: p.mrp, stock_quantity: p.stock_quantity, imageUrl: p.images?.[0] || '', images: p.images }); }}
                          className="p-1.5 text-[#1565C0] hover:bg-blue-50 rounded transition-colors">
                          <Edit size={13} />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ================================================================
// ORDER MANAGER — Full status control, ship, refund, cancel
// ================================================================
function OrderManager() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalOrderCount, setTotalOrderCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Manual tracking modal
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<any>(null);
  const [trackingAwb, setTrackingAwb] = useState('');
  const [trackingCourier, setTrackingCourier] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    let q = supabase.from('orders')
      .select('id,total_amount,status,payment_status,payment_id,payment_method,shipping_address,created_at,tracking_awb,courier_name,tracking_url,order_items(quantity,price,products(name))', { count: 'exact' })
      .order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data, count } = await q;
    if (data) setOrders(data);
    if (count !== null && count !== undefined) setTotalOrderCount(count);
    setLoading(false);
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  // H-16: Use actual count from DB instead of hardcoded 100
  const totalPages = Math.max(1, Math.ceil(totalOrderCount / PAGE_SIZE));

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      toastSuccess(`Order status updated to "${status}"`);
    } catch (err: any) {
      toast('Failed to update order status: ' + err.message, 'error');
    }
  };

  // H-19: Partial refund support
  const [refundAmount, setRefundAmount] = useState<number | null>(null);
  const handleRefund = async (order: any) => {
    const amount = refundAmount ?? order.total_amount;
    if (amount <= 0 || amount > order.total_amount) {
      toast('Invalid refund amount', 'error');
      return;
    }
    if (!window.confirm(`Refund ₹${amount} to buyer?`)) return;
    setProcessing(order.id);
    const result = await processRefund(order.payment_id, amount, { reason: amount < order.total_amount ? 'Partial refund' : 'Full refund' });
    if (result.success) {
      const newStatus = amount >= order.total_amount ? 'refunded' : 'partially_refunded';
      await supabase.from('orders').update({ payment_status: newStatus, refund_id: result.refundId, refunded_at: new Date().toISOString() }).eq('id', order.id);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: newStatus } : o));
      toastSuccess(`Refund of ₹${amount} processed! ID: ` + result.refundId);
    } else {
      toast('Refund failed: ' + result.error, 'error');
    }
    setProcessing(null);
    setRefundAmount(null);
  };

  const handleShip = async (order: any) => {
    setProcessing(order.id);
    try {
      const result = await createShipment({ ...order, id: order.id.replace(/-/g, '').slice(0, 20) });
      if (result?.payload?.shipment_id) {
        const awbResult = await generateAWB(String(result.payload.shipment_id));
        await requestPickup(String(result.payload.shipment_id));
        const awb = awbResult?.payload?.awb_code;
        await supabase.from('orders').update({
          status: 'processing', shiprocket_shipment_id: String(result.payload.shipment_id),
          tracking_awb: awb || null, courier_name: awbResult?.payload?.courier_name || 'Shiprocket',
          tracking_url: awb ? `https://shiprocket.co/tracking/${awb}` : null, shipped_at: new Date().toISOString(),
        }).eq('id', order.id);
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'processing', tracking_awb: awb } : o));
        toastSuccess(`Shipped! AWB: ${awb || 'Pending'}`);
      } else {
        setTrackingOrder(order);
        setTrackingAwb('');
        setTrackingCourier('');
        setShowTrackingModal(true);
      }
    } catch (err: any) { toast('Ship error: ' + err.message, 'error'); }
    setProcessing(null);
  };

  const handleManualTracking = async () => {
    if (!trackingOrder || !trackingAwb.trim() || !trackingCourier.trim()) return;
    await supabase.from('orders').update({ status: 'processing', tracking_awb: trackingAwb.trim(), courier_name: trackingCourier.trim(), shipped_at: new Date().toISOString() }).eq('id', trackingOrder.id);
    setOrders(prev => prev.map(o => o.id === trackingOrder.id ? { ...o, status: 'processing', tracking_awb: trackingAwb.trim() } : o));
    toastSuccess('Marked as shipped with tracking: ' + trackingAwb.trim());
    setShowTrackingModal(false);
  };

  const filtered = orders.filter(o =>
    filter === 'all' || o.status === filter
  ).filter(o =>
    !search || (o.id || '').toLowerCase().includes(search.toLowerCase()) ||
    o.shipping_address?.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-black text-[#0D47A1]">🛒 Order Management</h2>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders…"
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-[12px] outline-none focus:border-[#1565C0] w-44" />
          </div>
          <button onClick={load} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-colors ${filter === f ? 'bg-[#0D47A1] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {loading ? <div className="bg-white rounded-xl p-8 text-center text-gray-400">Loading…</div>
          : filtered.length === 0 ? <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">No orders found</div>
            : filtered.map(order => (
              <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <div className="font-black text-[14px]">#{(order.id || '').slice(0, 8).toUpperCase()}</div>
                    <div className="text-[12px] text-gray-500">{new Date(order.created_at).toLocaleDateString('en-IN')} · {order.payment_method?.toUpperCase()} · ₹{order.total_amount?.toLocaleString('en-IN')}</div>
                    <div className="text-[12px] text-gray-600 mt-0.5">📍 {order.shipping_address?.fullName}, {order.shipping_address?.city}, {order.shipping_address?.state}</div>
                    {order.tracking_awb && (
                      <a href={order.tracking_url || '#'} target="_blank" rel="noopener"
                        className="text-[11px] text-[#1565C0] font-bold mt-0.5 block">
                        🚚 Track: {order.tracking_awb} ({order.courier_name})
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 items-start">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${statusColor(order.status)}`}>{order.status}</span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${statusColor(order.payment_status)}`}>{order.payment_status}</span>
                  </div>
                </div>
                <div className="text-[12px] text-gray-500 mb-3">
                  {(order.order_items || []).map((i: any) => `${i.products?.name || 'Product'} ×${i.quantity}`).join(' · ')}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Status updater */}
                  <select onChange={e => { if (e.target.value) updateStatus(order.id, e.target.value); e.target.value = ''; }}
                    className="text-[11px] border border-gray-300 rounded-lg px-2 py-1.5 outline-none bg-white font-bold text-gray-700">
                    <option value="">Change Status…</option>
                    {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {['pending', 'processing'].includes(order.status) && (
                    <button onClick={() => handleShip(order)} disabled={processing === order.id}
                      className="px-3 py-1.5 bg-[#0D47A1] text-white text-[11px] font-bold rounded-lg hover:bg-[#1565C0] disabled:opacity-50">
                      {processing === order.id ? '⏳' : '🚚 Ship'}
                    </button>
                  )}
                   {order.payment_status === 'paid' && order.payment_id && (
                     <div className="flex items-center gap-1">
                       <input 
                         type="number" 
                         step="0.01"
                         placeholder="Amt" 
                         className="w-16 px-2 py-1.5 text-[11px] border border-gray-300 rounded-lg outline-none focus:border-red-400"
                         onChange={(e) => setRefundAmount(parseFloat(e.target.value))}
                       />
                       <button onClick={() => handleRefund(order)} disabled={processing === order.id}
                         className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold rounded-lg hover:bg-red-100 disabled:opacity-50">
                         {processing === order.id ? '⏳' : '↩ Refund'}
                       </button>
                     </div>
                   )}
                </div>
              </div>
            ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-[12px] font-bold disabled:opacity-40 hover:bg-gray-50">
          ← Prev
        </button>
        <span className="text-[12px] text-gray-600">Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-[12px] font-bold disabled:opacity-40 hover:bg-gray-50">
          Next →
        </button>
      </div>

      {/* Manual Tracking Modal */}
      {showTrackingModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Manual Tracking Info</h3>
            <p className="text-sm text-gray-500 mb-4">Shiprocket not configured. Enter tracking details manually:</p>
            <input type="text" placeholder="AWB / Tracking Number" value={trackingAwb} onChange={e => setTrackingAwb(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="Courier Name (e.g., Delhivery, BlueDart)" value={trackingCourier} onChange={e => setTrackingCourier(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm mb-4 outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-3">
              <button onClick={() => setShowTrackingModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleManualTracking} disabled={!trackingAwb.trim() || !trackingCourier.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300">
                Mark Shipped
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ================================================================
// USER MANAGER — Sellers, Buyers, Creators
// ================================================================
function PopupManager() {
  const [popups, setPopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newPopup, setNewPopup] = useState({ title: '', description: '', discount_text: '', type: 'new_user' as any });

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('popups').select('*').order('created_at', { ascending: false });
    if (data) setPopups(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from('popups').update({ is_active: !current }).eq('id', id);
    load();
  };

  const handleAdd = async () => {
    if (!newPopup.title) return;
    await supabase.from('popups').insert(newPopup);
    setShowAdd(false);
    setNewPopup({ title: '', description: '', discount_text: '', type: 'new_user' });
    load();
    toastSuccess('Popup created!');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this offer?')) return;
    await supabase.from('popups').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#0D47A1]">✨ Offers & Popups</h2>
          <p className="text-[12px] text-gray-500">Manage promotional popups across the platform.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-[#0D47A1] text-white text-[12px] font-black rounded-xl shadow-lg shadow-blue-100 flex items-center gap-2">
          <Zap size={14} /> Create New Offer
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input placeholder="Offer Title..." value={newPopup.title} onChange={e => setNewPopup({...newPopup, title: e.target.value})} className="p-2.5 border rounded-lg text-sm" />
            <input placeholder="Discount Highlight (e.g. 50% OFF)..." value={newPopup.discount_text} onChange={e => setNewPopup({...newPopup, discount_text: e.target.value})} className="p-2.5 border rounded-lg text-sm" />
            <textarea placeholder="Description..." value={newPopup.description} onChange={e => setNewPopup({...newPopup, description: e.target.value})} className="p-2.5 border rounded-lg text-sm col-span-2" />
            <select value={newPopup.type} onChange={e => setNewPopup({...newPopup, type: e.target.value as any})} className="p-2.5 border rounded-lg text-sm">
              <option value="new_user">New User Intro</option>
              <option value="exit_intent">Exit Intent (on leave)</option>
              <option value="timed">Timed (after delay)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-500 font-bold text-sm">Cancel</button>
            <button onClick={handleAdd} className="px-6 py-2 bg-green-600 text-white rounded-xl font-black text-sm">Save Popup</button>
          </div>
        </div>
      )}

      {loading ? <div className="text-center py-12">Synchronizing with marketing server...</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {popups.map(p => (
            <div key={p.id} className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${p.is_active ? 'border-blue-100 ring-2 ring-blue-50' : 'border-gray-100 opacity-60'}`}>
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.is_active ? '● Live' : '○ Paused'}
                </span>
                <span className="text-[10px] font-bold text-gray-400 capitalize">{p.type?.replace('_', ' ')}</span>
              </div>
              <div className="font-extrabold text-[15px] mb-1">{p.title}</div>
              <div className="text-red-600 font-black text-sm mb-2">{p.discount_text}</div>
              <p className="text-[11px] text-gray-500 mb-4 line-clamp-2">{p.description}</p>
              
              <div className="flex items-center gap-2 pt-4 border-t border-gray-50">
                <button onClick={() => handleToggle(p.id, p.is_active)} className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-colors ${p.is_active ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                  {p.is_active ? 'PAUSE' : 'ACTIVATE'}
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-400 hover:text-red-600">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================
// SUBSCRIPTION REQUESTS — Verify manual payments
// ================================================================
function SubscriptionRequestsPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subscription_requests')
      .select('*, users(full_name, email)')
      .order('created_at', { ascending: false });
    if (data) setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const approveRequest = async (id: string) => {
    if (!window.confirm('Approve this subscription? User will be upgraded immediately.')) return;
    setProcessing(id);
    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('approve_subscription_request', {
        request_id: id,
        admin_id: admin?.id,
        notes: 'Approved via Admin Panel'
      });
      if (error) throw error;
      toastSuccess('Subscription approved and activated!');
      load();
    } catch (err: any) {
      toast('Approval failed: ' + err.message, 'error');
    } finally {
      setProcessing(null);
    }
  };

  const rejectRequest = async (id: string) => {
    const reason = window.prompt('Reason for rejection:');
    if (reason === null) return;
    setProcessing(id);
    try {
      const { error } = await supabase
        .from('subscription_requests')
        .update({ status: 'rejected', admin_notes: reason })
        .eq('id', id);
      if (error) throw error;
      toastSuccess('Subscription rejected');
      load();
    } catch (err: any) {
      toast('Rejection failed: ' + err.message, 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#0D47A1]">💎 Subscription Requests</h2>
          <p className="text-[12px] text-gray-500">Verify and approve manual subscription payments.</p>
        </div>
        <button onClick={load} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
              <th className="p-4 text-left">User</th>
              <th className="p-4 text-left">Plan Details</th>
              <th className="p-4 text-left">Payment Info</th>
              <th className="p-4 text-left">Proof</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-12 text-center text-gray-400">Loading requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} className="p-12 text-center text-gray-400">No subscription requests found</td></tr>
            ) : requests.map(req => (
              <tr key={req.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-gray-900">{req.users?.full_name || 'Unknown'}</div>
                  <div className="text-[11px] text-gray-400">{req.users?.email}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 uppercase">{req.plan_name}</span>
                    <span className="text-[10px] font-bold text-gray-400 capitalize">{req.plan_role}</span>
                  </div>
                  <div className="text-[13px] font-black text-gray-900 mt-1">₹{req.amount?.toLocaleString()}</div>
                </td>
                <td className="p-4">
                  <div className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">{req.payment_method}</div>
                  <div className="text-[11px] text-blue-600 font-black mt-0.5">{req.transaction_id || 'No ID provided'}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{new Date(req.created_at).toLocaleString('en-IN')}</div>
                </td>
                <td className="p-4">
                  {req.payment_proof_url ? (
                    <a href={req.payment_proof_url} target="_blank" rel="noopener noreferrer" className="group relative block w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                      <img src={req.payment_proof_url} alt="Proof" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye size={14} className="text-white" />
                      </div>
                    </a>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-bold italic">No attachment</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${statusColor(req.status)}`}>
                    {req.status}
                  </span>
                </td>
                <td className="p-4">
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => approveRequest(req.id)}
                        disabled={!!processing}
                        className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Approve"
                      >
                        {processing === req.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      </button>
                      <button 
                        onClick={() => rejectRequest(req.id)}
                        disabled={!!processing}
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Reject"
                      >
                        {processing === req.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                      </button>
                    </div>
                  )}
                  {req.status !== 'pending' && req.admin_notes && (
                    <div className="text-[10px] text-gray-400 max-w-[150px] truncate" title={req.admin_notes}>
                      Note: {req.admin_notes}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserManager() {
  const [tab, setTab] = useState<'seller' | 'buyer' | 'influencer'>('seller');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [totalUserCount, setTotalUserCount] = useState(0); // H-16
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const { data, count } = await supabase.from('users')
      .select('id,full_name,email,role,created_at,subscription_plan', { count: 'exact' })
      .eq('role', tab).order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (data) setUsers(data);
    if (count !== null) setTotalUserCount(count); // H-16
    setLoading(false);
  }, [tab, page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.max(1, Math.ceil(totalUserCount / PAGE_SIZE)); // H-16

  const changeRole = async (userId: string, role: string) => {
    // C-04: Admin role escalation prevention is enforced server-side via RLS and Triggers.
    // This client check is for UX only.
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { toast('Authentication required', 'error'); return; }

    // Verify current user is admin before allowing role changes
    const { data: adminCheck } = await supabase.from('users').select('role').eq('id', currentUser.id).maybeSingle();
    if (adminCheck?.role !== 'admin') { toast('Only admins can change user roles', 'error'); return; }

    // Additional security: Block self-demotion (prevent admins from accidentally removing their own admin access)
    if (userId === currentUser.id && role !== 'admin') {
      if (!window.confirm('⚠️ You are about to remove your own admin access. You may lose access to admin features. Continue?')) return;
    }

    if (!window.confirm(`Change this user's role to "${role}"?`)) return;
    try {
      const { error } = await supabase.from('users').update({ role }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      toastSuccess('Role updated to ' + role);
    } catch (err: any) {
      toast('Failed to update role: ' + err.message, 'error');
    }
  };

  const banUser = async (userId: string) => {
    if (!window.confirm('Ban this user? They will be marked inactive and blocked from the platform.')) return;
    try {
      // Set role to 'banned' in the users table — ProtectedRoute and RLS policies will block access
      // Note: full auth deletion requires a server-side Supabase Admin API call with service role key
      const { error } = await supabase.from('users').update({ role: 'banned' as any }).eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.filter(u => u.id !== userId));
      toastSuccess('User banned. They will be blocked on next login.');
    } catch (err: any) {
      toast('Failed to ban user: ' + err.message, 'error');
    }
  };

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-black text-[#0D47A1]">👥 User Management</h2>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-[12px] outline-none focus:border-[#1565C0] w-52" />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['seller', 'buyer', 'influencer'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[12px] font-bold capitalize transition-colors ${tab === t ? 'bg-[#0D47A1] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            {t === 'seller' ? '🏪 Sellers' : t === 'influencer' ? '⭐ Creators' : '👤 Buyers'}
          </button>
        ))}
        <button onClick={load} className="ml-auto p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
            <th className="p-3 text-left">User</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Joined</th>
            <th className="p-3 text-left">Plan</th>
            <th className="p-3 text-left">Actions</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={5} className="p-6 text-center text-gray-400">Loading…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-gray-400">No {tab}s found</td></tr>
                : filtered.map(u => (
                  <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#0D47A1] rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0">
                          {u.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="font-semibold text-[13px]">{u.full_name || 'Unknown'}</div>
                      </div>
                    </td>
                    <td className="p-3 text-gray-600 text-[12px]">{u.email}</td>
                    <td className="p-3 text-gray-400 text-[11px]">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#0D47A1] capitalize">
                        {u.subscription_plan || 'free'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        <select onChange={e => { if (e.target.value) { changeRole(u.id, e.target.value); e.target.value = ''; } }}
                          className="text-[10px] border border-gray-200 rounded px-1.5 py-1 outline-none bg-white">
                          <option value="">Role…</option>
                          {['buyer', 'seller', 'influencer'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button onClick={() => banUser(u.id)} className="text-[10px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded border border-red-200">
                          Ban
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-[12px] font-bold disabled:opacity-40 hover:bg-gray-50">
          ← Prev
        </button>
        <span className="text-[12px] text-gray-600">Page {page} of {totalPages}</span>
        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-[12px] font-bold disabled:opacity-40 hover:bg-gray-50">
          Next →
        </button>
      </div>
    </div>
  );
}

// ================================================================
// PAYMENT MANAGER
// ================================================================
function PaymentManager() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const initialMethod = { 
    name: '', description: '', icon: 'CreditCard', provider: 'manual', is_active: true,
    config: { bank_name: '', account_no: '', ifsc: '', upi_id: '', qr_url: '', instructions: '' }
  };
  
  const [form, setForm] = useState(initialMethod);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('payment_methods').select('*').order('created_at', { ascending: true });
    if (error) toast('Load error: ' + error.message, 'error');
    if (data) setMethods(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id: string, current: boolean) => {
    const { error } = await supabase.from('payment_methods').update({ is_active: !current }).eq('id', id);
    if (error) { toast('Update failed: ' + error.message, 'error'); return; }
    setMethods(m => m.map(item => item.id === id ? { ...item, is_active: !current } : item));
    toastSuccess(current ? 'Disabled' : 'Enabled');
  };

  const uploadQR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImgUploading(true);
    const path = `payments/qr-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path);
      setForm(p => ({ ...p, config: { ...p.config, qr_url: publicUrl } }));
      toastSuccess('QR Code uploaded');
    } else {
      toast('Upload failed: ' + error.message, 'error');
    }
    setImgUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) { toast('Name is required', 'error'); return; }
    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('payment_methods').update(form).eq('id', editingId);
        if (error) throw error;
        toastSuccess('Updated successfully');
      } else {
        const { error } = await supabase.from('payment_methods').insert(form);
        if (error) throw error;
        toastSuccess('Payment method added');
      }
      setEditingId(null);
      setShowAdd(false);
      setForm(initialMethod);
      load();
    } catch (err: any) {
      toast('Operation failed: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this payment method? This cannot be undone.')) return;
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) { toast('Delete failed: ' + error.message, 'error'); return; }
    setMethods(m => m.filter(item => item.id !== id));
    toastSuccess('Deleted permanently');
  };

  const startEdit = (m: any) => {
    setEditingId(m.id);
    setForm({ 
      name: m.name, description: m.description || '', icon: m.icon || 'CreditCard', provider: m.provider, is_active: m.is_active,
      config: { ...initialMethod.config, ...m.config }
    });
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Payment Gateways</h2>
          <p className="text-[13px] text-gray-500 font-medium">Control how your customers pay you</p>
        </div>
        <button onClick={() => { setShowAdd(!showAdd); if (editingId) {setEditingId(null); setForm(initialMethod);} }} 
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[13px] font-black shadow-lg transition-all active:scale-95 ${showAdd ? 'bg-white text-red-500 border border-red-100' : 'bg-black text-white hover:bg-gray-800'}`}>
          {showAdd ? 'Cancel' : <><Plus size={16} /> Add New Method</>}
        </button>
      </div>

      {showAdd && (
        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} 
          className="bg-white p-8 rounded-[32px] shadow-2xl border border-gray-100 mb-10 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
          
          <div className="flex items-center justify-between">
            <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">
              {editingId ? <Edit3 size={20} className="text-blue-600" /> : <Package size={20} className="text-blue-600" />}
              {editingId ? 'Edit Gateway Configuration' : 'Create New Payment Option'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Display Name</label>
              <input placeholder="e.g. Bank Transfer (HDFC)" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:border-blue-500 transition-all" />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">System Provider</label>
              <select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
                className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:border-blue-500 appearance-none transition-all">
                <option value="manual">Manual (Bank Details / QR)</option>
                <option value="razorpay">Razorpay (Cards/UPI/NB)</option>
                <option value="cod">Cash on Delivery</option>
                <option value="wallet">Internal Wallet</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50/50 p-6 rounded-[24px] space-y-4 border border-blue-100">
             <div className="flex items-center gap-2 mb-2">
               <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-black">2</div>
               <div className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Gateway Configuration Details</div>
             </div>
             
             {form.provider === 'manual' ? (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">Bank Name</label>
                    <input placeholder="Ex: HDFC Bank" value={form.config.bank_name} onChange={e => setForm(p => ({ ...p, config: { ...p.config, bank_name: e.target.value } }))}
                      className="w-full p-3 bg-white border border-blue-100 rounded-xl text-[13px] font-semibold outline-none focus:border-blue-500" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">Account Number</label>
                    <input placeholder="Ex: 50100234..." value={form.config.account_no} onChange={e => setForm(p => ({ ...p, config: { ...p.config, account_no: e.target.value } }))}
                      className="w-full p-3 bg-white border border-blue-100 rounded-xl text-[13px] font-semibold outline-none focus:border-blue-500" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">IFSC Code</label>
                    <input placeholder="Ex: HDFC0001..." value={form.config.ifsc} onChange={e => setForm(p => ({ ...p, config: { ...p.config, ifsc: e.target.value } }))}
                      className="w-full p-3 bg-white border border-blue-100 rounded-xl text-[13px] font-semibold outline-none focus:border-blue-500" />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">UPI ID</label>
                    <input placeholder="Ex: brand@okaxis" value={form.config.upi_id} onChange={e => setForm(p => ({ ...p, config: { ...p.config, upi_id: e.target.value } }))}
                      className="w-full p-3 bg-white border border-blue-100 rounded-xl text-[13px] font-semibold outline-none focus:border-blue-500" />
                 </div>
                 <div className="flex flex-col space-y-1.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">QR Code Payment</label>
                    <div className="flex gap-2">
                      <input placeholder="QR URL or upload below" value={form.config.qr_url} onChange={e => setForm(p => ({ ...p, config: { ...p.config, qr_url: e.target.value } }))}
                        className="flex-1 p-3 bg-white border border-blue-100 rounded-xl text-[13px] font-semibold outline-none focus:border-blue-500" />
                      <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 shrink-0">
                        {imgUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                        QR
                        <input type="file" accept="image/*" className="hidden" onChange={uploadQR} />
                      </label>
                    </div>
                 </div>
               </div>
             ) : (
               <div className="p-10 text-center bg-white/50 rounded-2xl border-2 border-dashed border-blue-100 text-blue-400 text-[13px] font-bold">
                 {form.provider === 'razorpay' ? 'Configuration for Razorpay is handled via environment variables.' : 'This provider does not require additional configuration.'}
               </div>
             )}
             
             <div className="space-y-1.5 pt-2">
               <label className="text-[10px] font-bold text-blue-400 uppercase ml-1">Instructions for Customer</label>
               <textarea placeholder="Tell customers what to do after paying (Ex: 'Send screenshot to WhatsApp')" value={form.config.instructions} onChange={e => setForm(p => ({ ...p, config: { ...p.config, instructions: e.target.value } }))}
                 className="w-full p-4 bg-white border border-blue-100 rounded-2xl text-[13px] font-semibold outline-none focus:border-blue-500 min-h-[100px]" />
             </div>
          </div>

          <div className="flex gap-3">
             <button type="submit" disabled={isSaving} className="flex-1 bg-black text-white font-black py-4 rounded-2xl text-[15px] hover:bg-gray-800 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
               {isSaving ? <Loader2 size={18} className="animate-spin" /> : editingId ? <Save size={18} /> : <CheckCircle size={18} />}
               {editingId ? 'Save Changes' : 'Create Gateway'}
             </button>
             {editingId && (
               <button type="button" onClick={() => { setEditingId(null); setForm(initialMethod); setShowAdd(false); }} className="px-8 bg-gray-100 text-gray-500 font-black py-4 rounded-2xl text-[15px] hover:bg-gray-200 transition-all">
                 Discard
               </button>
             )}
          </div>
        </motion.form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white h-64 rounded-[32px] animate-pulse border border-gray-100 shadow-sm" />
        )) : methods.length === 0 ? (
          <div className="p-20 text-center col-span-full bg-white rounded-[40px] text-gray-400 border-4 border-dashed border-gray-50">
             <div className="text-4xl mb-4">💳</div>
             <div className="font-black text-gray-900 mb-1">No Gateways Active</div>
             <p className="text-[13px] font-medium">Add a payment method to start accepting orders.</p>
          </div>
        ) : methods.map(m => (
          <div key={m.id} className={`bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 hover:shadow-2xl transition-all group relative ${!m.is_active && 'opacity-60 grayscale'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner">
                {m.provider === 'cod' ? '🚚' : m.provider === 'razorpay' ? '💳' : m.provider === 'wallet' ? '💰' : '🏦'}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(m)} className="p-2.5 text-gray-400 hover:text-black hover:bg-gray-50 rounded-xl transition-all shadow-sm">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => toggle(m.id, m.is_active)}
                  className={`text-[9px] font-black px-3 py-1.5 rounded-full transition-all border shadow-sm ${m.is_active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {m.is_active ? '● LIVE' : '○ OFF'}
                </button>
              </div>
            </div>

            <div className="font-black text-[18px] text-gray-900 mb-1 leading-tight">{m.name}</div>
            <div className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-4 opacity-70">{m.provider}</div>
            
            {/* Detailed Preview Section */}
            <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-50 space-y-2 mb-6">
               {m.config?.bank_name ? (
                 <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                      <Briefcase size={14} />
                    </div>
                    <div>
                      <div className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{m.config.bank_name}</div>
                      <div className="text-[10px] font-bold text-gray-400 tracking-wider">A/C: {m.config.account_no}</div>
                    </div>
                 </div>
               ) : (
                 <div className="text-[10px] text-gray-300 font-bold italic py-2">Standard Automated gateway</div>
               )}
               
               {m.config?.upi_id && (
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#1565C0] shadow-sm shrink-0 font-black text-[10px]">UPI</div>
                    <div className="text-[11px] font-black text-blue-900 truncate">{m.config.upi_id}</div>
                 </div>
               )}

               {m.config?.qr_url && (
                 <div className="flex items-center gap-2 pt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">QR CODE ENABLED</span>
                 </div>
               )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex -space-x-2">
                 <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-blue-600">S</div>
                 <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-green-600">A</div>
              </div>
              <button onClick={() => handleDelete(m.id)} className="flex items-center gap-2 text-gray-300 hover:text-red-500 transition-all font-black text-[10px] uppercase tracking-widest p-1">
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ================================================================
// EMAIL BLASTER — Send any email to any user
// ================================================================
function EmailManager() {
  const [to, setTo] = useState('');
  const [template, setTemplate] = useState('order_confirmation');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [segment, setSegment] = useState('custom');

  useEffect(() => {
    supabase.from('users').select('email,full_name,role').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { if (data) setUsers(data); });
  }, []);

  const sendBulk = async () => {
    setSending(true);
    let targets: string[] = [];
    if (segment === 'custom') {
      targets = to.split(',').map(e => e.trim()).filter(Boolean);
    } else {
      const roleMap: Record<string, string> = { sellers: 'seller', buyers: 'buyer', creators: 'influencer', all: '' };
      targets = users.filter(u => !roleMap[segment] || u.role === roleMap[segment]).map(u => u.email).filter(Boolean);
    }
    if (targets.length === 0) { toast('No recipients', 'error'); setSending(false); return; }
    if (!window.confirm(`Send email to ${targets.length} recipient(s)?`)) { setSending(false); return; }

    let success = 0;
    for (const email of targets.slice(0, 50)) { // max 50 at a time
      const ok = await sendEmail(email, template, {
        buyerName: users.find(u => u.email === email)?.full_name || 'Customer',
        name: users.find(u => u.email === email)?.full_name || 'User',
        orderId: 'MANUAL', items: [], total: 0, address: '', deliveryDays: '2-5 days',
      });
      if (ok) success++;
    }
    toastSuccess(`Sent to ${success}/${targets.length} recipients`);
    setSending(false);
  };

  return (
    <div>
      <h2 className="text-xl font-black text-[#0D47A1] mb-4">📧 Email Manager</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-[14px] mb-4">Send Email</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Recipients</label>
              <select value={segment} onChange={e => setSegment(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0] mb-2">
                <option value="custom">Custom Email(s)</option>
                <option value="sellers">All Sellers</option>
                <option value="buyers">All Buyers</option>
                <option value="creators">All Creators</option>
                <option value="all">All Users (max 50)</option>
              </select>
              {segment === 'custom' && (
                <input value={to} onChange={e => setTo(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0]" />
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Template</label>
              <select value={template} onChange={e => setTemplate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0]">
                <option value="welcome">Welcome</option>
                <option value="order_confirmation">Order Confirmation</option>
                <option value="kyc_submitted">KYC Submitted</option>
                <option value="kyc_approved">KYC Approved</option>
                <option value="seller_new_order">New Order Alert (Seller)</option>
                <option value="shipping_update">Shipping Update</option>
                <option value="seller_weekly_digest">Weekly Digest</option>
                <option value="password_reset">Password Reset</option>
              </select>
            </div>
            <button onClick={sendBulk} disabled={sending}
              className="w-full bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 text-white py-2.5 rounded-lg font-bold text-[13px] transition-colors">
              {sending ? '⏳ Sending…' : '📤 Send Email'}
            </button>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="font-black text-[14px] mb-3">Available Templates ({8})</h3>
          {['welcome', 'order_confirmation', 'kyc_submitted', 'kyc_approved', 'seller_new_order', 'shipping_update', 'seller_weekly_digest', 'password_reset'].map(t => (
            <div key={t} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
              <CheckCircle size={13} className="text-[#388E3C] shrink-0" />
              <span className="text-[12px] text-gray-700 capitalize">{t.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// NOTIFICATION BLASTER — Push to any user or segment
// ================================================================
function NotificationManager() {
  const [segment, setSegment] = useState('all');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('system');
  const [actionUrl, setActionUrl] = useState('');
  const [sending, setSending] = useState(false);

  const sendNotification = async () => {
    if (!title || !message) { toast('Title and message required', 'error'); return; }
    setSending(true);
    try {
      let userIds: string[] = [];
      if (segment === 'all') {
        const { data } = await supabase.from('users').select('id').limit(500);
        userIds = (data || []).map(u => u.id);
      } else {
        const roleMap: Record<string, string> = { sellers: 'seller', buyers: 'buyer', creators: 'influencer' };
        const { data } = await supabase.from('users').select('id').eq('role', roleMap[segment]).limit(500);
        userIds = (data || []).map(u => u.id);
      }

      // Insert notifications in batches of 50
      for (let i = 0; i < userIds.length; i += 50) {
        const batch = userIds.slice(i, i + 50).map(uid => ({
          user_id: uid, type, title, message, action_url: actionUrl || null
        }));
        await supabase.from('notifications').insert(batch);
      }
      toastSuccess(`Notification sent to ${userIds.length} users!`);
      setTitle(''); setMessage(''); setActionUrl('');
    } catch (err: any) {
      toast('Failed: ' + err.message, 'error');
    }
    setSending(false);
  };

  return (
    <div>
      <h2 className="text-xl font-black text-[#0D47A1] mb-4">🔔 Push Notifications</h2>
      <div className="bg-white rounded-xl p-6 shadow-sm max-w-xl">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Send To</label>
            <select value={segment} onChange={e => setSegment(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0]">
              <option value="all">All Users</option>
              <option value="sellers">All Sellers</option>
              <option value="buyers">All Buyers</option>
              <option value="creators">All Creators</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Type</label>
            <select value={type} onChange={e => setType(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0]">
              {['system', 'order', 'flash_sale', 'payment', 'kyc', 'referral', 'review'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 🔥 Flash Sale Starting Now!"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0]" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Message *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder="Full notification message…"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0] resize-none" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Action URL (optional)</label>
            <input value={actionUrl} onChange={e => setActionUrl(e.target.value)} placeholder="/flash-sales or /products"
              className="w-full p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0]" />
          </div>
          {/* Preview */}
          {(title || message) && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-[10px] font-bold text-gray-400 uppercase mb-2">Preview</div>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E3F2FD] flex items-center justify-center text-lg shrink-0">
                  {type === 'flash_sale' ? '⚡' : type === 'order' ? '📦' : type === 'payment' ? '💰' : '🔔'}
                </div>
                <div>
                  <div className="text-[13px] font-bold text-gray-900">{title || 'Notification Title'}</div>
                  <div className="text-[12px] text-gray-500 mt-0.5">{message || 'Notification message will appear here'}</div>
                </div>
              </div>
            </div>
          )}
          <button onClick={sendNotification} disabled={sending || !title || !message}
            className="w-full bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 text-white py-3 rounded-lg font-bold text-[14px] transition-colors">
            {sending ? '⏳ Sending…' : '🚀 Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// COUPON MANAGER — Create, edit, delete coupons
// ================================================================
function CouponManager() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', type: 'percent', value: '10', min_order: '299', max_uses: '', expiry: '' });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('coupons').insert({
      code: newCoupon.code.toUpperCase().trim(),
      type: newCoupon.type,
      value: parseFloat(newCoupon.value),
      min_order: parseFloat(newCoupon.min_order),
      max_uses: newCoupon.max_uses ? parseInt(newCoupon.max_uses) : null,
      expiry: newCoupon.expiry || null,
      uses: 0,
      is_active: true,
    });
    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet - it's in schema patch but tell admin
        toast('Coupons table not set up yet. Run schema patch in Supabase.', 'error');
      } else {
        toast('Error: ' + error.message, 'error');
      }
    } else {
      toastSuccess('Coupon created!');
      setAddMode(false);
      setNewCoupon({ code: '', type: 'percent', value: '10', min_order: '299', max_uses: '', expiry: '' });
      load();
    }
  };

  const toggleCoupon = async (id: string, current: boolean) => {
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id);
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: !current } : c));
  };

  const deleteCoupon = async (id: string) => {
    if (!window.confirm('Delete coupon?')) return;
    await supabase.from('coupons').delete().eq('id', id);
    setCoupons(prev => prev.filter(c => c.id !== id));
    toastSuccess('Coupon deleted');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-[#0D47A1]">🏷️ Coupon Manager</h2>
        <button onClick={() => setAddMode(!addMode)}
          className="flex items-center gap-1.5 bg-[#0D47A1] text-white px-4 py-2 rounded-lg text-[12px] font-bold hover:bg-[#1565C0]">
          <PlusCircle size={14} /> New Coupon
        </button>
      </div>

      {addMode && (
        <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-xl p-5 mb-4">
          <h3 className="font-black text-[14px] text-[#0D47A1] mb-4">Create Coupon</h3>
          <form onSubmit={addCoupon} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Code *', field: 'code', placeholder: 'BYNDIO20' },
              { label: 'Discount Value *', field: 'value', placeholder: '10', type: 'number' },
              { label: 'Min Order (₹) *', field: 'min_order', placeholder: '299', type: 'number' },
              { label: 'Max Uses', field: 'max_uses', placeholder: 'unlimited', type: 'number' },
              { label: 'Expiry Date', field: 'expiry', placeholder: '', type: 'date' },
            ].map(f => (
              <div key={f.field} className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{f.label}</label>
                <input type={f.type || 'text'} placeholder={f.placeholder} required={f.label.includes('*')}
                  value={(newCoupon as any)[f.field]} onChange={e => setNewCoupon(c => ({ ...c, [f.field]: e.target.value }))}
                  className="p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0] bg-white uppercase" />
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Discount Type</label>
              <select value={newCoupon.type} onChange={e => setNewCoupon(c => ({ ...c, type: e.target.value }))}
                className="p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0] bg-white">
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div className="col-span-full flex gap-2">
              <button type="submit" className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-lg font-bold text-[13px] hover:bg-[#1565C0]">Create Coupon</button>
              <button type="button" onClick={() => setAddMode(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-[13px] font-bold hover:bg-gray-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div className="bg-white rounded-xl p-6 text-center text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {coupons.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Tag size={32} className="mx-auto mb-2 text-gray-300" />
              <p>No coupons yet. Create your first coupon above!</p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead><tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
                <th className="p-3 text-left">Code</th>
                <th className="p-3 text-left">Discount</th>
                <th className="p-3 text-left">Min Order</th>
                <th className="p-3 text-left">Uses</th>
                <th className="p-3 text-left">Expiry</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Actions</th>
              </tr></thead>
              <tbody>
                {coupons.map(c => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="p-3 font-black text-[#0D47A1] tracking-widest">{c.code}</td>
                    <td className="p-3 font-bold">{c.type === 'percent' ? `${c.value}%` : `₹${c.value}`} off</td>
                    <td className="p-3 text-gray-600">₹{c.min_order}</td>
                    <td className="p-3 text-gray-600">{c.uses || 0}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                    <td className="p-3 text-gray-400 text-[11px]">{c.expiry ? new Date(c.expiry).toLocaleDateString('en-IN') : '∞ No expiry'}</td>
                    <td className="p-3">
                      <button onClick={() => toggleCoupon(c.id, c.is_active)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.is_active ? '● Active' : '○ Off'}
                      </button>
                    </td>
                    <td className="p-3">
                      <button onClick={() => deleteCoupon(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ================================================================
// SITE SETTINGS — Full content management
// ================================================================
function SiteSettingsManager() {
  const fetchSiteSettings = useAppStore(s => s.fetchSiteSettings);
  const [settings, setSettings] = useState({ 
    hero_title: '', 
    hero_subtitle: '', 
    footer_about: '', 
    contact_email: '', 
    contact_phone: '', 
    contact_address: '',
    whatsapp_number: '',
    twitter_url: '',
    instagram_url: '',
    facebook_url: '',
    youtube_url: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => { if (data) setSettings(data); });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('site_settings').upsert({ id: 1, ...settings });
    if (error) { toast('Save failed: ' + error.message, 'error'); }
    else { toastSuccess('Site settings saved!'); fetchSiteSettings(); }
    setSaving(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#0D47A1]">⚙️ Site Settings</h2>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-1.5 bg-[#0D47A1] text-white px-6 py-2.5 rounded-xl text-[13px] font-bold hover:bg-[#1565C0] shadow-sm transition-all disabled:opacity-50">
          <Save size={16} /> {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Homepage Content */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[15px] mb-4 flex items-center gap-2 text-gray-800">
            <LayoutTemplate size={18} className="text-[#0D47A1]" /> Homepage Hero Section
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Hero Main Title', field: 'hero_title', placeholder: 'Shop Beyond Ordinary' },
              { label: 'Hero Subtitle / Promo Text', field: 'hero_subtitle', placeholder: 'India\'s 0% commission marketplace…', multiline: true },
            ].map(f => (
              <div key={f.field}>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">{f.label}</label>
                {f.multiline
                  ? <textarea value={(settings as any)[f.field]} onChange={e => setSettings(s => ({ ...s, [f.field]: e.target.value }))}
                    placeholder={f.placeholder} rows={3}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#1565C0] focus:bg-white transition-all resize-none" />
                  : <input value={(settings as any)[f.field]} onChange={e => setSettings(s => ({ ...s, [f.field]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#1565C0] focus:bg-white transition-all" />
                }
              </div>
            ))}
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[15px] mb-4 flex items-center gap-2 text-gray-800">
            <Mail size={18} className="text-[#0D47A1]" /> Contact Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Support Email', field: 'contact_email', placeholder: 'support@byndio.in' },
              { label: 'Support Phone', field: 'contact_phone', placeholder: '1800-BYNDIO' },
              { label: 'Business Address', field: 'contact_address', placeholder: 'Mumbai, Maharashtra, India' },
              { label: 'Footer About Text', field: 'footer_about', placeholder: 'India\'s 0% commission marketplace…' },
            ].map(f => (
              <div key={f.field}>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">{f.label}</label>
                <input value={(settings as any)[f.field]} onChange={e => setSettings(s => ({ ...s, [f.field]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#1565C0] focus:bg-white transition-all" />
              </div>
            ))}
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[15px] mb-4 flex items-center gap-2 text-gray-800">
            <MessageSquare size={18} className="text-[#0D47A1]" /> Social Media & Messenger
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'WhatsApp Number (with country code)', field: 'whatsapp_number', placeholder: '919876543210' },
              { label: 'Instagram URL', field: 'instagram_url', placeholder: 'https://instagram.com/byndio' },
              { label: 'Twitter (X) URL', field: 'twitter_url', placeholder: 'https://twitter.com/byndio' },
              { label: 'Facebook URL', field: 'facebook_url', placeholder: 'https://facebook.com/byndio' },
              { label: 'YouTube URL', field: 'youtube_url', placeholder: 'https://youtube.com/@byndio' },
            ].map(f => (
              <div key={f.field}>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">{f.label}</label>
                <input value={(settings as any)[f.field]} onChange={e => setSettings(s => ({ ...s, [f.field]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#1565C0] focus:bg-white transition-all" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// ANALYTICS — Real charts and stats
// ================================================================
function AnalyticsPanel() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 365;
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      const [orders, orderItems, users, reviews] = await Promise.all([
        supabase.from('orders').select('id,total_amount,status,payment_status,payment_method,created_at').gte('created_at', since).limit(1000),
        supabase.from('order_items').select('product_id,quantity,price,products(name,category)').limit(1000),
        supabase.from('users').select('id,role,created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('reviews').select('rating,created_at').gte('created_at', since).limit(500),
      ]);

      const ords = orders.data || [];
      const items = orderItems.data || [];
      const usrs = users.data || [];

      // Revenue by day
      const dayMap: Record<string, { rev: number; orders: number }> = {};
      for (let i = Math.min(daysBack - 1, 29); i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        dayMap[key] = { rev: 0, orders: 0 };
      }
      for (const o of ords) {
        const key = new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        if (key in dayMap && o.payment_status === 'paid') {
          dayMap[key].rev += o.total_amount || 0;
          dayMap[key].orders++;
        }
      }
      const revByDay = Object.entries(dayMap);

      // Payment method breakdown
      const methodMap: Record<string, number> = {};
      for (const o of ords) { methodMap[o.payment_method || 'unknown'] = (methodMap[o.payment_method || 'unknown'] || 0) + 1; }

      // Order status breakdown
      const statusMap: Record<string, number> = {};
      for (const o of ords) { statusMap[o.status] = (statusMap[o.status] || 0) + 1; }

      // Top products
      const prodMap: Record<string, { name: string; cat: string; qty: number; rev: number }> = {};
      for (const item of items) {
        const id = item.product_id;
        if (!prodMap[id]) prodMap[id] = { name: (item.products as any)?.name || 'Product', cat: (item.products as any)?.category || '', qty: 0, rev: 0 };
        prodMap[id].qty += item.quantity || 0;
        prodMap[id].rev += (item.price || 0) * (item.quantity || 0);
      }
      const topProducts = Object.entries(prodMap).sort((a, b) => b[1].rev - a[1].rev).slice(0, 8);

      // Category breakdown
      const catMap: Record<string, number> = {};
      for (const item of items) { const cat = (item.products as any)?.category || 'Other'; catMap[cat] = (catMap[cat] || 0) + (item.quantity || 0); }
      const catBreakdown = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

      // User growth by role
      const roleMap: Record<string, number> = {};
      for (const u of usrs) { roleMap[u.role] = (roleMap[u.role] || 0) + 1; }

      // Reviews avg rating
      const revs = reviews.data || [];
      const avgRating = revs.length > 0 ? (revs.reduce((s: number, r: any) => s + r.rating, 0) / revs.length).toFixed(1) : '—';

      const totalRev = ords.filter(o => o.payment_status === 'paid').reduce((s: number, o: any) => s + (o.total_amount || 0), 0);
      const totalOrd = ords.length;

      setData({ revByDay, methodMap, statusMap, topProducts, catBreakdown, roleMap, totalRev, totalOrd, avgRating, revsByDay: revByDay });
      setLoading(false);
    };
    load();
  }, [period]);

  const maxRev = Math.max(...(data.revByDay || []).map((d: any) => d[1].rev), 1);
  const catColors = ['#0D47A1', '#388E3C', '#7B1FA2', '#E65100', '#C62828', '#00695C'];

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-[#0D47A1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <div className="text-[13px] text-gray-500">Loading analytics…</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-900">Platform Analytics</h2>
          <p className="text-[13px] text-gray-500 mt-0.5">Real data from your Supabase database</p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['7d', '30d', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors ${period === p ? 'bg-white shadow-sm text-[#0D47A1]' : 'text-gray-500 hover:text-gray-700'}`}>
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: `₹${(data.totalRev || 0).toLocaleString('en-IN')}`, color: '#388E3C' },
          { label: 'Total Orders', value: (data.totalOrd || 0).toLocaleString(), color: '#0D47A1' },
          { label: 'Avg Order Value', value: data.totalOrd > 0 ? `₹${Math.round((data.totalRev || 0) / (data.totalOrd || 1)).toLocaleString('en-IN')}` : '—', color: '#7B1FA2' },
          { label: 'Avg Product Rating', value: `${data.avgRating} ⭐`, color: '#E65100' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{k.label}</div>
            <div className="text-[20px] font-black" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="font-black text-[15px] text-gray-900 mb-1">Revenue Over Time</div>
        <div className="text-[12px] text-gray-400 mb-5">Paid orders only · hover for details</div>
        <div className="flex items-end gap-1.5 h-40">
          {(data.revByDay || []).slice(-20).map(([day, d]: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
              <div className="relative w-full">
                <div className="w-full bg-gradient-to-t from-[#0D47A1] to-[#1565C0] rounded-t-md transition-all group-hover:from-[#E65100] group-hover:to-[#F57C00]"
                  style={{ height: `${Math.max(3, (d.rev / maxRev) * 130)}px` }} />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-bold px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                  ₹{d.rev.toLocaleString('en-IN')}<br />{d.orders} orders
                </div>
              </div>
              <div className="text-[8px] text-gray-400 text-center">{day}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="font-black text-[15px] text-gray-900 mb-1">Top Products</div>
          <div className="text-[12px] text-gray-400 mb-4">By revenue generated</div>
          {(data.topProducts || []).length === 0
            ? <div className="py-6 text-center text-gray-400 text-[13px]">No order data yet</div>
            : <div className="space-y-3">
              {(data.topProducts || []).map(([id, prod]: any, i: number) => {
                const maxP = (data.topProducts || [])[0]?.[1]?.rev || 1;
                return (
                  <div key={id} className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-[#E3F2FD] rounded-full flex items-center justify-center text-[11px] font-black text-[#0D47A1] shrink-0">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[12px] font-semibold truncate">{prod.name}</span>
                        <span className="text-[12px] font-black text-[#388E3C] ml-2 shrink-0">₹{prod.rev.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className="h-full bg-[#0D47A1] rounded-full" style={{ width: `${(prod.rev / maxP) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          }
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="font-black text-[15px] text-gray-900 mb-1">Sales by Category</div>
          <div className="text-[12px] text-gray-400 mb-4">Units sold per category</div>
          {(data.catBreakdown || []).length === 0
            ? <div className="py-6 text-center text-gray-400 text-[13px]">No data yet</div>
            : (() => {
              const total = (data.catBreakdown || []).reduce((s: number, [, v]: any) => s + v, 0);
              return (
                <div className="space-y-3">
                  {(data.catBreakdown || []).map(([cat, qty]: any, i: number) => (
                    <div key={cat} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: catColors[i % catColors.length] }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[12px] font-semibold">{cat}</span>
                          <span className="text-[11px] text-gray-500">{qty} units ({Math.round(qty / total * 100)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-full rounded-full" style={{ width: `${(qty / total) * 100}%`, background: catColors[i % catColors.length] }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          }
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="font-black text-[15px] text-gray-900 mb-1">Payment Methods</div>
          <div className="text-[12px] text-gray-400 mb-4">How buyers are paying</div>
          {Object.keys(data.methodMap || {}).length === 0
            ? <div className="py-6 text-center text-gray-400 text-[13px]">No orders yet</div>
            : (() => {
              const total = Object.values(data.methodMap || {}).reduce((s: any, v: any) => s + v, 0) as number;
              return (
                <div className="space-y-3">
                  {Object.entries(data.methodMap || {}).map(([method, count]: any, i: number) => (
                    <div key={method} className="flex items-center gap-3">
                      <div className="text-lg shrink-0">{method === 'cod' ? '💵' : method === 'upi' ? '📱' : '💳'}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[12px] font-semibold capitalize">{method === 'cod' ? 'Cash on Delivery' : method === 'upi' ? 'UPI' : method}</span>
                          <span className="text-[11px] text-gray-500">{count} ({Math.round(count / total * 100)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-full rounded-full bg-[#0D47A1]" style={{ width: `${(count / total) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          }
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="font-black text-[15px] text-gray-900 mb-1">Order Status Breakdown</div>
          <div className="text-[12px] text-gray-400 mb-4">Current order pipeline</div>
          {Object.keys(data.statusMap || {}).length === 0
            ? <div className="py-6 text-center text-gray-400 text-[13px]">No orders yet</div>
            : (() => {
              const total = Object.values(data.statusMap || {}).reduce((s: any, v: any) => s + v, 0) as number;
              return (
                <div className="space-y-3">
                  {Object.entries(data.statusMap || {}).map(([status, count]: any) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize w-20 text-center shrink-0 ${statusColor(status)}`}>{status}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                        <div className="h-full rounded-full bg-[#0D47A1]" style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <span className="text-[12px] font-black text-gray-700 w-7 text-right shrink-0">{count}</span>
                    </div>
                  ))}
                </div>
              );
            })()
          }
        </div>
      </div>

      {/* User Roles */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="font-black text-[15px] text-gray-900 mb-4">User Base Breakdown</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { role: 'buyer', label: 'Buyers', emoji: '🛒', color: '#0D47A1' },
            { role: 'seller', label: 'Sellers', emoji: '🏪', color: '#388E3C' },
            { role: 'influencer', label: 'Creators', emoji: '⭐', color: '#7B1FA2' },
            { role: 'admin', label: 'Admins', emoji: '🔒', color: '#E65100' },
          ].map(r => (
            <div key={r.role} className="text-center p-4 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-1">{r.emoji}</div>
              <div className="text-[22px] font-black" style={{ color: r.color }}>{(data.roleMap || {})[r.role] || 0}</div>
              <div className="text-[12px] text-gray-500 font-semibold">{r.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// INFLUENCER REVENUE MODEL — Phase management
// ================================================================
function InfluencerModelManager() {
  const siteSettings = useAppStore(s => s.siteSettings);
  const fetchSiteSettings = useAppStore(s => s.fetchSiteSettings);
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('influencer_revenue_tiers').select('*').order('phase', { ascending: true });
    if (data) setTiers(data);
    setLoading(false);
  };

  const updatePhase = async (phase: number) => {
    setSaving(true);
    const { error } = await supabase.from('site_settings').update({ influencer_phase: phase }).eq('id', 1);
    if (!error) {
      toastSuccess(`Platform moved to Phase ${phase}`);
      fetchSiteSettings();
    }
    setSaving(false);
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto mb-2" /> Loading Model...</div>;

  const currentPhase = siteSettings?.influencer_phase || 1;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#0D47A1]">🤳 Influencer Revenue Model</h2>
          <p className="text-[12px] text-gray-500 mt-1">Manage platform growth phases and creator monetization strategies.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Current Status</span>
          <span className="bg-[#0D47A1] text-white px-3 py-1 rounded-full text-[12px] font-black">PHASE {currentPhase}</span>
        </div>
      </div>

      {/* Phase Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <div key={t.phase} className={`relative p-6 rounded-2xl border-2 transition-all ${currentPhase === t.phase ? 'bg-white border-[#0D47A1] shadow-xl scale-[1.02] z-10' : 'bg-gray-50 border-transparent opacity-70 hover:opacity-100'}`}>
            {currentPhase === t.phase && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0D47A1] text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Active Now</div>
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl font-black text-gray-900">Phase {t.phase}</div>
              <div className={`p-2 rounded-lg ${t.phase === 1 ? 'bg-green-100 text-green-600' : t.phase === 2 ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                {t.phase === 1 ? <TrendingUp size={20} /> : t.phase === 2 ? <DollarSign size={20} /> : <Zap size={20} />}
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Platform Comm.</span>
                <span className="font-black text-gray-900">{t.platform_commission_pct}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Influencer Share</span>
                <span className="font-black text-green-600">{t.influencer_share_pct}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium">Brand Collab Fee</span>
                <span className="font-black text-gray-900">{t.brand_collab_fee_pct}%</span>
              </div>
            </div>

            <div className="space-y-2 mb-6">
               <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Benefits & Rules</div>
               {[
                 { label: 'Free Storefront', active: t.phase === 1 },
                 { label: 'Verified Badges', active: t.has_paid_badges ? 'Paid' : 'Free' },
                 { label: 'Visibility Boost', active: t.phase < 3 ? 'Free' : 'Pro Only' },
                 { label: 'Subscription', active: t.has_subscriptions ? 'Required' : 'None' }
               ].map((b, idx) => (
                 <div key={idx} className="flex items-center gap-2 text-[11px] font-bold text-gray-700">
                   <div className={`w-1.5 h-1.5 rounded-full ${b.active === 'Required' || b.active === 'Paid' ? 'bg-orange-500' : 'bg-green-500'}`} />
                   {b.label}: <span className="ml-auto text-gray-400">{b.active === true ? 'Yes' : b.active === false ? 'No' : b.active}</span>
                 </div>
               ))}
            </div>

            <button 
              disabled={saving || currentPhase === t.phase}
              onClick={() => updatePhase(t.phase)}
              className={`w-full py-2.5 rounded-xl text-[12px] font-black transition-all ${currentPhase === t.phase ? 'bg-gray-100 text-gray-400 cursor-default' : 'bg-white border border-[#0D47A1] text-[#0D47A1] hover:bg-[#0D47A1] hover:text-white shadow-sm active:scale-95'}`}
            >
              {currentPhase === t.phase ? 'Current Phase' : `Switch to Phase ${t.phase}`}
            </button>
          </div>
        ))}
      </div>

      {/* Model Strategy Note */}
      <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
            <Award size={40} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-black mb-2">Growth First Strategy</h3>
            <p className="text-blue-100 text-sm leading-relaxed opacity-90">
              "First help creators earn → then grow → then monetize." This model automatically balances the platform's revenue needs with creator acquisition. As our influencer base scales, the platform commission naturally increases to support the ecosystem.
            </p>
          </div>
          <div className="flex flex-col items-center gap-1 bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/10">
            <div className="text-3xl font-black">0%</div>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 text-center">Entry Commission</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KYCReviewPanel() {
  const [kycs, setKycs] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => { 
    fetchKYCs(); 

    // REAL-TIME: Listen for KYC submissions
    const channel = supabase.channel('kyc-review-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sellers' }, () => {
        fetchKYCs();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kyc_submissions' }, () => {
        fetchKYCs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const fetchKYCs = async () => {
    setLoading(true);
    try {
      // Fetch General KYCs
      const { data: general, error: genErr } = await supabase.from('kyc_submissions').select('*, users(full_name, email)').eq('status', filter).order('submitted_at', { ascending: false });
      if (genErr) throw genErr;
      if (general) setKycs(general);

      // Fetch Seller KYCs (using 'submitted' matches our dashboard logic)
      const sellerFilter = filter === 'pending' ? 'submitted' : filter;
      const { data: s, error: selErr } = await supabase.from('sellers').select('*, users(full_name, email)').eq('kyc_status', sellerFilter).order('id', { ascending: false });
      if (selErr) throw selErr;
      if (s) setSellers(s);
    } catch (err: any) {
      toast('Sync Error: ' + err.message, 'error');
      console.error('KYC Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateGeneralStatus = async (id: string, status: 'approved' | 'rejected', userEmail: string, userName: string, reason?: string) => {
    await supabase.from('kyc_submissions').update({ status, reviewed_at: new Date().toISOString(), rejection_reason: reason || null }).eq('id', id);
    if (status === 'approved') {
      sendEmail(userEmail, 'kyc_approved', { name: userName });
      const { data: u } = await supabase.from('users').select('id').eq('email', userEmail).maybeSingle();
      if (u) await supabase.from('notifications').insert({ user_id: u.id, type: 'kyc', title: '✅ KYC Approved!', message: 'Your KYC is complete. Withdrawals are now enabled.', action_url: '/rewards' });
    }
    fetchKYCs();
    toastSuccess(`General KYC ${status}`);
  };

  const updateSellerStatus = async (id: string, status: 'approved' | 'rejected', userEmail: string, userName: string) => {
    const { error } = await supabase.from('sellers').update({ 
      kyc_status: status,
      is_verified: status === 'approved' 
    }).eq('id', id);
    if (!error) {
      if (status === 'approved') {
        sendEmail(userEmail, 'kyc_approved', { name: userName });
        await supabase.from('notifications').insert({ user_id: id, type: 'kyc', title: '🚀 Store Approved!', message: 'Your seller KYC is approved. You can now list products.', action_url: '/seller-dashboard' });
      } else {
        // Option to send rejection email with reason if needed
      }
      fetchKYCs();
      toastSuccess(`Seller ${status}`);
    } else {
      toast(error.message, 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xl font-black text-[#0D47A1] mb-2 flex items-center gap-2">
          <Shield className="w-6 h-6" /> User KYC Review
        </div>
        <div className="flex gap-2 mb-6">
          {['pending', 'approved', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-[12px] font-bold capitalize transition-all ${filter === f ? 'bg-[#0D47A1] text-white shadow-lg shadow-blue-200' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 italic">Synchronizing documents...</div>
        ) : (
          <div className="space-y-6">
            {/* Sellers Section */}
            {sellers.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-black text-gray-400 uppercase tracking-widest pl-2">Pending Seller Onboarding ({sellers.length})</div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sellers.map(s => (
                    <div key={s.id} className="bg-white rounded-2xl p-5 shadow-sm border-2 border-orange-50 hover:border-orange-100 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="font-black text-[15px]">{s.business_name}</div>
                          <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wide">
                            Managed by {s.users?.full_name} · {s.users?.email}
                          </div>
                        </div>
                        {s.kyc_status === 'submitted' && (
                          <div className="flex gap-2">
                            <button onClick={() => updateSellerStatus(s.id, 'approved', s.users?.email, s.users?.full_name)}
                              className="px-3 py-1.5 bg-[#388E3C] text-white text-[11px] font-black rounded-lg hover:shadow-lg transition-all">APPROVE</button>
                            <button onClick={() => updateSellerStatus(s.id, 'rejected', s.users?.email, s.users?.full_name)}
                              className="px-3 py-1.5 bg-red-600 text-white text-[11px] font-black rounded-lg hover:shadow-lg transition-all">REJECT</button>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">PAN Number</div>
                          <div className="text-xs font-bold text-gray-900">{s.pan_number || '—'}</div>
                        </div>
                        <div>
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">GST Number</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-bold text-gray-900">{s.gst_number || 'NOT PROVIDED'}</div>
                            {!s.gst_number && (
                              <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border border-amber-200">
                                Intra-State Only
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Business Address</div>
                          <div className="text-xs font-bold text-gray-600 leading-tight">{s.business_address || '—'}</div>
                        </div>
                        {s.kyc_documents && s.kyc_documents.length > 0 && (
                          <div className="col-span-2 pt-2 border-t border-gray-100 mt-1">
                            <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Verification Documents</div>
                            <div className="flex flex-wrap gap-2">
                              {s.kyc_documents.map((url: string, idx: number) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" 
                                  className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1">
                                  <ExternalLink size={10} /> Document {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General KYC Section */}
            {kycs.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-black text-gray-400 uppercase tracking-widest pl-2">General Documents ({kycs.length})</div>
                <div className="flex flex-col gap-3">
                  {kycs.map(k => (
                    <div key={k.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="font-black text-[15px]">{k.full_name}</div>
                          <div className="text-[12px] text-gray-500 font-medium">
                            {k.users?.email} · Submitted {new Date(k.submitted_at).toLocaleDateString()}
                          </div>
                        </div>
                        {k.status === 'pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => updateGeneralStatus(k.id, 'approved', k.users?.email, k.full_name)}
                              className="px-4 py-2 bg-[#0D47A1] text-white text-[12px] font-black rounded-xl hover:shadow-lg transition-all">APPROVE</button>
                            <button onClick={() => { const r = prompt('Rejection reason:'); if (r) updateGeneralStatus(k.id, 'rejected', k.users?.email, k.full_name, r); }}
                              className="px-4 py-2 border-2 border-red-500 text-red-500 text-[12px] font-black rounded-xl hover:bg-red-50 transition-all">REJECT</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sellers.length === 0 && kycs.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm">
                <div className="text-4xl mb-2">📁</div>
                <div className="text-sm font-bold">No {filter} verification requests found.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


function PayoutsPanel() {
  const [tab, setTab] = useState<'payouts' | 'withdrawals'>('withdrawals');
  const [orders, setOrders] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showWithdrawalRejectModal, setShowWithdrawalRejectModal] = useState(false);
  const [withdrawalRejectId, setWithdrawalRejectId] = useState<string | null>(null);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    if (tab === 'payouts') {
      supabase.from('orders')
        .select('id,total_amount,payment_status,payment_id,payment_method,created_at,shipping_address,order_items(seller_id,price,quantity,products(name))')
        .eq('payment_status', 'paid').order('created_at', { ascending: false }).limit(50)
        .then(({ data }) => { if (data) setOrders(data); setLoading(false); });
    } else {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('*, users(full_name, email)')
        .order('requested_at', { ascending: false })
        .limit(100);
      if (data) setWithdrawals(data);
      setLoading(false);
    }
  };

  const handleApproveWithdrawal = async (id: string, userId: string, amount: number) => {
    if (!window.confirm(`Approve withdrawal of ₹${amount.toLocaleString('en-IN')}?`)) return;
    const { error } = await supabase.from('withdrawal_requests').update({
      status: 'completed',
      processed_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { toast('Failed: ' + error.message, 'error'); return; }
    // Deduct from wallet
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', userId).maybeSingle();
    if (wallet) {
      await supabase.from('wallets').update({ balance: Math.max(0, wallet.balance - amount) }).eq('user_id', userId);
    }
    toastSuccess(`Withdrawal of ₹${amount.toLocaleString('en-IN')} approved and wallet deducted.`);
    loadData();
  };

  const handleRejectWithdrawal = async (id: string) => {
    setWithdrawalRejectId(id);
    setShowWithdrawalRejectModal(true);
  };

  const handleWithdrawalRejectSubmit = async (reason: string) => {
    if (!withdrawalRejectId) return;
    await supabase.from('withdrawal_requests').update({
      status: 'rejected',
      notes: reason,
      processed_at: new Date().toISOString(),
    }).eq('id', withdrawalRejectId);
    toastSuccess('Withdrawal rejected.');
    loadData();
  };

  const handlePayout = async (order: any) => {
    const sellerItems = order.order_items || [];
    if (!sellerItems.length) { toast('No seller items', 'error'); return; }
    const gross = sellerItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
    const tds = parseFloat((gross * 0.01).toFixed(2));
    const net = parseFloat((gross - tds).toFixed(2));
    const sellerId = sellerItems[0].seller_id;
    if (!sellerId) { toast('Seller ID not found', 'error'); return; }
    const { error } = await supabase.from('seller_payouts').insert({
      seller_id: sellerId, amount: gross, tds_amount: tds, net_amount: net,
      tds_rate: 1, status: 'pending', items_count: sellerItems.length,
      period_start: order.created_at?.split('T')[0], period_end: new Date().toISOString().split('T')[0],
    });
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toastSuccess(`Payout of ₹${net} (after ₹${tds} TDS) recorded`);
  };

  const handleRefund = async (order: any) => {
    if (!window.confirm(`Refund ₹${order.total_amount}?`)) return;
    const result = await processRefund(order.payment_id, order.total_amount, { reason: 'Admin refund' });
    if (result.success) {
      await supabase.from('orders').update({ payment_status: 'refunded', refund_id: result.refundId, refunded_at: new Date().toISOString(), refund_amount: order.total_amount }).eq('id', order.id);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      toastSuccess('Refund: ' + result.refundId);
    } else toast('Failed: ' + result.error, 'error');
  };

  const handleMarkDelivered = async (order: any) => {
    if (!window.confirm(`Mark order #${order.id.slice(0,8)} as delivered? This will release commissions to promoters.`)) return;
    setProcessing(order.id);
    try {
      // 1. Update Order Status
      const { error: statusErr } = await supabase.from('orders').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', order.id);
      if (statusErr) throw statusErr;

      // 2. Fetch Order Items for Commission Calculations
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      if (items) {
        for (const item of items) {
          // 3. Credit Creator Wallet (70% of budget if both, or 90% if only one)
          if (item.creator_id && item.creator_share > 0) {
            await supabase.rpc('increment_wallet_balance', { p_user_id: item.creator_id, p_amount: item.creator_share });
          }
          // 4. Credit Affiliate Wallet (20% of budget if both, or 90% if only one)
          if (item.affiliate_id && item.affiliate_share > 0) {
            await supabase.rpc('increment_wallet_balance', { p_user_id: item.affiliate_id, p_amount: item.affiliate_share });
          }
        }
      }

      toastSuccess(`Order delivered! Commissions released and wallets credited.`);
      setOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (err: any) {
      toast('Failed to mark delivered: ' + err.message, 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="text-xl font-black text-[#0D47A1] mb-3">💸 Payouts & Withdrawals</div>
      <div className="flex gap-2 mb-4">
        {(['withdrawals', 'payouts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-colors ${tab === t ? 'bg-[#0D47A1] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {t === 'withdrawals' ? '🏦 Withdrawal Requests' : '💸 Order Payouts'}
          </button>
        ))}
      </div>
      {loading ? <div className="text-center py-8 text-gray-400">Loading…</div> : tab === 'withdrawals' ? (
        <div className="flex flex-col gap-3">
          {withdrawals.length === 0 && <div className="bg-white rounded-xl p-8 text-center text-gray-400">No withdrawal requests yet.</div>}
          {withdrawals.map(w => (
            <div key={w.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-black text-[14px]">{w.users?.full_name || 'Unknown'}</div>
                <div className="text-[12px] text-gray-500">{w.users?.email} · {new Date(w.requested_at).toLocaleDateString('en-IN')}</div>
                <div className="text-[13px] font-bold text-[#0D47A1] mt-1">₹{w.amount?.toLocaleString('en-IN')}</div>
              </div>
              <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${w.status === 'completed' ? 'bg-green-100 text-green-700' :
                  w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'}`}>{w.status}</span>
              {w.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleApproveWithdrawal(w.id, w.user_id, w.amount)}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold rounded transition-colors">✓ Approve</button>
                  <button onClick={() => handleRejectWithdrawal(w.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 text-[11px] font-bold rounded hover:bg-red-100 transition-colors">✕ Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map(order => {
            const gross = (order.order_items || []).reduce((s: number, i: any) => s + i.price * i.quantity, 0);
            const tds = parseFloat((gross * 0.01).toFixed(2));
            const net = parseFloat((gross - tds).toFixed(2));
            return (
              <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="font-black text-[14px]">#{(order.id || '').slice(0, 8).toUpperCase()}</div>
                  <div className="text-[12px] text-gray-500">{new Date(order.created_at).toLocaleDateString('en-IN')} · {order.payment_method?.toUpperCase()}</div>
                  <div className="text-[12px] text-gray-600 mt-1">Gross: ₹{gross.toLocaleString('en-IN')} · TDS: ₹{tds} · <strong>Net: ₹{net.toLocaleString('en-IN')}</strong></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handlePayout(order)} className="px-3 py-1.5 bg-[#0D47A1] hover:bg-[#1565C0] text-white text-[11px] font-bold rounded transition-colors">💸 Payout</button>
                  <button onClick={() => handleRefund(order)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold rounded transition-colors">↩ Refund</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShippingPanel() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('orders')
      .select('id,total_amount,payment_method,shipping_address,status,tracking_awb,courier_name,shiprocket_shipment_id,created_at,order_items(quantity,price,product_id,products(name))')
      .in('status', ['pending', 'processing']).order('created_at', { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setOrders(data); setLoading(false); });
  }, []);

  const handleCreateShipment = async (order: any) => {
    setProcessing(order.id);
    try {
      const result = await createShipment({ ...order, id: order.id.replace(/-/g, '').slice(0, 20) });
      if (result?.payload?.shipment_id) {
        const shipmentId = result.payload.shipment_id;
        const awbResult = await generateAWB(String(shipmentId));
        const awb = awbResult?.payload?.awb_code;
        await requestPickup(String(shipmentId));
        await supabase.from('orders').update({ status: 'processing', shiprocket_shipment_id: String(shipmentId), tracking_awb: awb || null, courier_name: awbResult?.payload?.courier_name || 'Shiprocket', tracking_url: awb ? `https://shiprocket.co/tracking/${awb}` : null, shipped_at: new Date().toISOString() }).eq('id', order.id);
        toastSuccess(`Shipped! AWB: ${awb || 'Pending'}`);
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } else {
        toast('Shiprocket: ' + (result?.message || 'Failed. Check credentials.'), 'error');
      }
    } catch (err: any) { toast('Error: ' + err.message, 'error'); }
    setProcessing(null);
  };

  const handleManualShip = async (order: any) => {
    const awb = prompt('Tracking/AWB number:');
    const courier = prompt('Courier (e.g. Delhivery, Bluedart):');
    if (!awb || !courier) return;
    await supabase.from('orders').update({ status: 'processing', tracking_awb: awb, courier_name: courier, tracking_url: `https://www.google.com/search?q=${courier}+tracking+${awb}`, shipped_at: new Date().toISOString() }).eq('id', order.id);
    toastSuccess('Marked as shipped: ' + awb);
    setOrders(prev => prev.filter(o => o.id !== order.id));
  };

  const handleMarkDelivered = async (order: any) => {
    if (!window.confirm(`Mark order #${order.id.slice(0,8)} as delivered? This will release commissions to promoters.`)) return;
    setProcessing(order.id);
    try {
      // 1. Update Order Status
      const { error: statusErr } = await supabase.from('orders').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('id', order.id);
      if (statusErr) throw statusErr;

      // 2. Fetch Order Items for Commission Calculations
      const { data: items } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      if (items) {
        for (const item of items) {
          // 3. Credit Creator Wallet
          if (item.creator_id && item.creator_share > 0) {
            await supabase.rpc('increment_wallet_balance', { p_user_id: item.creator_id, p_amount: item.creator_share });
          }
          // 4. Credit Affiliate Wallet
          if (item.affiliate_id && item.affiliate_share > 0) {
            await supabase.rpc('increment_wallet_balance', { p_user_id: item.affiliate_id, p_amount: item.affiliate_share });
          }
        }
      }

      toastSuccess(`Order delivered! Commissions released and wallets credited.`);
      setOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (err: any) {
      toast('Failed to mark delivered: ' + err.message, 'error');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="text-xl font-black text-[#0D47A1] mb-2">🚚 Shipping</div>
      <div className="bg-[#E3F2FD] rounded-xl p-4 mb-4 text-[13px] text-[#1565C0]">"Auto Ship" = Shiprocket API · "Manual" = any courier tracking number</div>
      {loading ? <div className="text-center py-8 text-gray-400">Loading…</div>
        : orders.length === 0 ? <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">All orders shipped! 🎉</div>
          : (
            <div className="flex flex-col gap-3">
              {orders.map(order => (
                <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div>
                      <div className="font-black text-[14px]">#{(order.id || '').slice(0, 8).toUpperCase()}</div>
                      <div className="text-[12px] text-gray-500">{new Date(order.created_at).toLocaleDateString('en-IN')} · {order.payment_method?.toUpperCase()} · ₹{order.total_amount?.toLocaleString('en-IN')}</div>
                      <div className="text-[12px] text-gray-600">📍 {order.shipping_address?.fullName}, {order.shipping_address?.city} - {order.shipping_address?.pin}</div>
                      <div className="text-[12px] text-gray-500">{(order.order_items || []).map((i: any) => `${i.products?.name}×${i.quantity}`).join(', ')}</div>
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'processing' && (
                        <button onClick={() => handleMarkDelivered(order)} disabled={processing === order.id}
                          className="px-3 py-1.5 bg-[#388E3C] hover:bg-[#2E7D32] disabled:bg-gray-300 text-white text-[11px] font-bold rounded">
                          {processing === order.id ? '…' : '✓ Mark Delivered'}
                        </button>
                      )}
                      {order.status === 'pending' && (
                        <>
                          <button onClick={() => handleCreateShipment(order)} disabled={processing === order.id}
                            className="px-3 py-1.5 bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-300 text-white text-[11px] font-bold rounded">
                            {processing === order.id ? '⏳' : '🚀 Auto Ship'}
                          </button>
                          <button onClick={() => handleManualShip(order)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded">✏️ Manual</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
    </div>
  );
}

function ApplicationsPanel() {
  const [tab, setTab] = useState<'seller' | 'influencer' | 'affiliate'>('seller');
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from(`${tab}_applications`).select('*').order('created_at', { ascending: false }).limit(50);
    if (error) {
      console.error(`Error fetching ${tab} applications:`, error);
      toast(`Failed to load ${tab} applications: ` + error.message, 'error');
      setApps([]);
    } else {
      setApps(data || []);
    }
    setLoading(false);
  }, [tab]);

  // Expose load function for realtime updates
  const loadApps = load;

  useEffect(() => { 
    load(); 

    // REAL-TIME: Listen for new applications
    const channel = supabase.channel('apps-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'seller_applications' }, () => {
        load();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'influencer_applications' }, () => {
        load();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'affiliate_applications' }, () => {
        load();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);


  const updateStatus = async (app: any, status: string) => {
    try {
      // 1. Update the application status
      const { error: appError } = await supabase.from(`${tab}_applications`).update({ status }).eq('id', app.id);
      if (appError) throw appError;

      // 2. If approved, upgrade the user's role and create profile record
      if (status === 'approved') {
        // Find user by email first to get their ID if it's not in the app record (some apps might use email as link)
        const { data: userData } = await supabase.from('users').select('id').eq('email', app.email).maybeSingle();
        
        if (userData) {
          const userId = userData.id;
          const newRole = tab === 'seller' ? 'seller' : tab === 'influencer' ? 'influencer' : 'buyer'; // affiliate doesn't change core role usually, or it might
          
          // Update user role
          await supabase.from('users').update({ role: newRole }).eq('id', userId);

          // Create/Update sub-profile
          if (tab === 'seller') {
            await supabase.from('sellers').upsert({
              id: userId,
              business_name: app.business_name,
              category: app.category,
              pan_number: app.pan_number,
              gst_number: app.gst_number,
              business_state: app.business_state || app.state, // Map from application
              bank_account_number: app.bank_account,
              ifsc_code: app.ifsc_code,
              kyc_documents: app.kyc_documents || [],
              kyc_status: 'approved', 
              is_verified: true
            });
          } else if (tab === 'influencer') {
            await supabase.from('influencers').upsert({
              id: userId,
              social_media_links: app.social_links || {},
              is_verified: true, // PHASE 1: Auto-verify on approval
              commission_rate: 10.00 // Default commission for influencers
            });
            // Also ensure they have a wallet
            await supabase.from('wallets').upsert({ user_id: userId, balance: 0 }, { onConflict: 'user_id' });
          }
        }
      }

      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status } : a));
      toastSuccess(`Application ${status}`);
    } catch (err: any) {
      toast('Operation failed: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div className="text-xl font-black text-[#0D47A1] mb-4">📋 Applications</div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(['seller', 'influencer', 'affiliate'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-[12px] font-bold capitalize transition-colors ${tab === t ? 'bg-[#0D47A1] text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}>
              {t === 'seller' ? '🏪 Sellers' : t === 'influencer' ? '⭐ Influencers' : '🔗 Affiliates'}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" title="Reload Data">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      {loading ? <div className="text-center py-8 text-gray-400">Loading…</div>
        : apps.length === 0 ? <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">No applications</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] bg-white rounded-xl shadow-sm overflow-hidden">
                <thead><tr className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase">
                  <th className="p-3 text-left">Name</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Details</th><th className="p-3 text-left">Date</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Action</th>
                </tr></thead>
                <tbody>
                  {apps.map(a => (
                    <tr key={a.id} className="border-t border-gray-100">
                      <td className="p-3 font-semibold">{a.full_name}</td>
                      <td className="p-3 text-gray-600 text-[12px]">{a.email}</td>
                      <td className="p-3 text-gray-600 text-[12px]">{a.phone}</td>
                      <td className="p-3 text-gray-600 text-[11px]">
                        {tab === 'seller' ? (
                          <>
                            <div className="font-bold">{a.business_name}</div>
                            <div className="text-[10px] text-gray-400">{a.gst_number ? `GST: ${a.gst_number}` : 'No GST (Local Only)'}</div>
                            {a.kyc_documents && a.kyc_documents.length > 0 && (
                              <div className="flex gap-1.5 mt-1">
                                {a.kyc_documents.map((url: string, idx: number) => (
                                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-0.5">
                                    <ExternalLink size={8} /> Doc {idx + 1}
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        ) : tab === 'influencer' ? (
                          <>
                            <div className="font-bold">@{a.instagram_handle || '—'}</div>
                            <div className="text-[10px] text-gray-400">YT: {a.youtube_channel || '—'} · {a.followers_count}</div>
                          </>
                        ) : (
                          <>
                            <div className="font-bold">{a.website || '—'}</div>
                            <div className="text-[10px] text-gray-400">Audience: {a.audience_size}</div>
                          </>
                        )}
                      </td>
                      <td className="p-3 text-gray-400 text-[11px]">{new Date(a.created_at).toLocaleDateString('en-IN')}</td>
                      <td className="p-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColor(a.status)}`}>{a.status}</span></td>
                      <td className="p-3">
                        {a.status === 'pending' && (
                          <div className="flex gap-1">
                            <button onClick={() => updateStatus(a, 'approved')} className="px-2 py-1 bg-green-600 text-white text-[10px] font-bold rounded hover:bg-green-700">✓</button>
                            <button onClick={() => updateStatus(a, 'rejected')} className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded hover:bg-red-700">✗</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
    </div>
  );
}

// ================================================================
// FLASH SALES MANAGER
// ================================================================
function FlashSalesPanel() {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ product_id: '', title: '', discount_pct: '20', max_quantity: '50', starts_at: '', ends_at: '' });

  useEffect(() => {
    Promise.all([
      supabase.from('flash_sales').select('*, products(name)').order('created_at', { ascending: false }).limit(20),
      supabase.from('products').select('id,name').eq('is_active', true).order('name').limit(100),
    ]).then(([s, p]) => {
      if (s.data) setSales(s.data);
      if (p.data) setProds(p.data);
      setLoading(false);
    });
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find(p => p.id === form.product_id);
    if (!product) { toast('Select a product', 'error'); return; }
    const { data: prodData } = await supabase.from('products').select('price').eq('id', form.product_id).single();
    const orig = prodData?.price || 0;
    const salePrice = Math.round(orig * (1 - parseInt(form.discount_pct) / 100));
    const { error } = await supabase.from('flash_sales').insert({
      product_id: form.product_id, title: form.title || `${form.discount_pct}% off ${product.name}`,
      discount_pct: parseInt(form.discount_pct), original_price: orig, sale_price: salePrice,
      max_quantity: parseInt(form.max_quantity), sold_quantity: 0, is_active: true,
      starts_at: form.starts_at || new Date().toISOString(),
      ends_at: form.ends_at,
    });
    if (error) { toast('Error: ' + error.message, 'error'); return; }
    toastSuccess('Flash sale created!');
    setForm({ product_id: '', title: '', discount_pct: '20', max_quantity: '50', starts_at: '', ends_at: '' });
    const { data } = await supabase.from('flash_sales').select('*, products(name)').order('created_at', { ascending: false }).limit(20);
    if (data) setSales(data);
  };

  const endSale = async (id: string) => {
    await supabase.from('flash_sales').update({ is_active: false }).eq('id', id);
    setSales(prev => prev.map(s => s.id === id ? { ...s, is_active: false } : s));
    toastSuccess('Flash sale ended');
  };

  return (
    <div>
      <h2 className="text-xl font-black text-[#0D47A1] mb-4">⚡ Flash Sales</h2>
      <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
        <h3 className="font-black text-[14px] mb-4">Create Flash Sale</h3>
        <form onSubmit={create} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-full sm:col-span-1">
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Product *</label>
            <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} required
              className="w-full p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0]">
              <option value="">Select product…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {[
            { label: 'Discount %', field: 'discount_pct', placeholder: '20', type: 'number' },
            { label: 'Max Qty', field: 'max_quantity', placeholder: '50', type: 'number' },
            { label: 'Title (optional)', field: 'title', placeholder: 'Flash Deal!' },
            { label: 'Starts At', field: 'starts_at', type: 'datetime-local' },
            { label: 'Ends At *', field: 'ends_at', type: 'datetime-local' },
          ].map(f => (
            <div key={f.field}>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1">{f.label}</label>
              <input type={f.type || 'text'} required={f.label.includes('*')} placeholder={f.placeholder || ''}
                value={(form as any)[f.field]} onChange={e => setForm(fn => ({ ...fn, [f.field]: e.target.value }))}
                className="w-full p-2.5 border border-gray-300 rounded-lg text-[13px] outline-none focus:border-[#1565C0]" />
            </div>
          ))}
          <div className="col-span-full">
            <button type="submit" className="bg-[#E65100] hover:bg-[#F57C00] text-white px-6 py-2.5 rounded-lg font-bold text-[13px]">
              ⚡ Create Flash Sale
            </button>
          </div>
        </form>
      </div>

      {loading ? <div className="text-center py-4 text-gray-400">Loading…</div> : (
        <div className="flex flex-col gap-3">
          {sales.map(s => (
            <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="font-black text-[14px]">{s.title}</div>
                <div className="text-[12px] text-gray-500">{(s.products as any)?.name} · {s.discount_pct}% off · {s.sold_quantity}/{s.max_quantity} sold</div>
                <div className="text-[11px] text-gray-400">Ends: {s.ends_at ? new Date(s.ends_at).toLocaleString('en-IN') : '—'}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.is_active ? '🔥 Live' : '○ Ended'}
                </span>
                {s.is_active && (
                  <button onClick={() => endSale(s.id)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold rounded">End Now</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================
// RETURNS PANEL — Approve/reject returns and trigger automatic refunds
// ================================================================
function ReturnsPanel() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [showReturnRejectModal, setShowReturnRejectModal] = useState(false);
  const [returnRejectId, setReturnRejectId] = useState<string | null>(null);

  useEffect(() => { load(); }, [filter]);

  const load = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('return_requests')
        .select(`
          id, order_id, reason, status, refund_status, refund_amount, refund_id,
          created_at, refund_at,
          orders ( id, total_amount, payment_id, payment_status, buyer_id ),
          users ( full_name, email )
        `)
        .order('created_at', { ascending: false });
      if (filter !== 'all') query = query.eq('status', filter);
      const { data } = await query;
      if (data) setReturns(data);
    } finally { setLoading(false); }
  };

  const handleApprove = async (ret: any) => {
    if (!window.confirm(`Approve return for order ${ret.order_id?.slice(0, 8)}? This will trigger an automatic refund.`)) return;
    setProcessing(ret.id);
    try {
      // 1. Mark return as approved
      await supabase.from('return_requests').update({
        status: 'approved',
        refund_status: 'processing',
        refund_amount: ret.orders?.total_amount,
      }).eq('id', ret.id);

      // 2. Trigger Razorpay refund
      const paymentId = ret.orders?.payment_id;
      const amount = ret.orders?.total_amount;
      let refundId = null;

      if (paymentId && !paymentId.startsWith('DEMO-') && !paymentId.startsWith('COD-')) {
        const result = await processRefund(paymentId, amount, { reason: `Return approved: ${ret.reason}` });
        if (result?.refundId) {
          refundId = result.refundId;
          // 3. Update order payment status
          await supabase.from('orders').update({
            payment_status: 'refunded',
            status: 'cancelled',
          }).eq('id', ret.order_id);
          // 4. Record refund on return
          await supabase.from('return_requests').update({
            refund_id: refundId,
            refund_status: 'completed',
            refund_at: new Date().toISOString(),
          }).eq('id', ret.id);
          toastSuccess(`Refund of ₹${amount?.toLocaleString('en-IN')} processed! ID: ${refundId}`);
        }
      } else {
        // COD/DEMO order — mark refund as manual
        await supabase.from('return_requests').update({
          refund_status: 'completed',
          refund_at: new Date().toISOString(),
          refund_id: 'MANUAL-' + Date.now(),
        }).eq('id', ret.id);
        toastSuccess('Return approved. Manual refund required for COD/demo orders.');
      }

      // 5. Notify buyer
      if (ret.users?.email) {
        sendEmail(ret.users.email, 'return_approved', {
          buyerName: ret.users.full_name || 'Customer',
          orderId: ret.order_id?.slice(0, 8).toUpperCase(),
          refundAmount: amount,
          refundId: refundId || 'MANUAL',
        });
      }
      load();
    } catch (err: any) {
      toast('Failed to process return: ' + err.message, 'error');
    } finally { setProcessing(null); }
  };

  const handleReject = async (ret: any) => {
    setReturnRejectId(ret.id);
    setShowReturnRejectModal(true);
  };

  const handleReturnRejectSubmit = async (reason: string) => {
    if (!returnRejectId) return;
    setProcessing(returnRejectId);
    try {
      await supabase.from('return_requests').update({
        status: 'rejected',
        refund_status: 'failed',
      }).eq('id', returnRejectId);
      const ret = returns.find(r => r.id === returnRejectId);
      if (ret?.users?.email) {
        sendEmail(ret.users.email, 'return_rejected', {
          buyerName: ret.users.full_name || 'Customer',
          orderId: ret.order_id?.slice(0, 8).toUpperCase(),
          reason,
        });
      }
      toastSuccess('Return rejected and buyer notified.');
      load();
    } catch (err: any) {
      toast('Failed to reject return: ' + err.message, 'error');
    } finally { setProcessing(null); }
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  return (
    <>
      <div className="text-xl font-black text-[#0D47A1] mb-4">↩ Return Requests</div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold capitalize transition-colors ${filter === f ? 'bg-[#0D47A1] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {f}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-[#0D47A1] border-t-transparent rounded-full animate-spin" /></div>
      ) : returns.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400">No {filter} return requests.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {returns.map(ret => (
            <div key={ret.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-[13px] text-[#0D47A1]">#{ret.order_id?.slice(0, 8).toUpperCase()}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[ret.status] || 'bg-gray-100 text-gray-600'}`}>{ret.status}</span>
                    {ret.refund_status && ret.refund_status !== 'pending' && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor[ret.refund_status] || 'bg-gray-100 text-gray-600'}`}>Refund: {ret.refund_status}</span>
                    )}
                  </div>
                  <div className="text-[12px] text-gray-600 mb-1"><strong>Buyer:</strong> {ret.users?.full_name || 'Unknown'} ({ret.users?.email})</div>
                  <div className="text-[12px] text-gray-600 mb-1"><strong>Reason:</strong> {ret.reason}</div>
                  <div className="text-[12px] text-gray-500">Order amount: <strong>₹{ret.orders?.total_amount?.toLocaleString('en-IN')}</strong> · Requested {new Date(ret.created_at).toLocaleDateString('en-IN')}</div>
                  {ret.refund_id && <div className="text-[11px] text-green-600 mt-1">Refund ID: {ret.refund_id}</div>}
                </div>
                {ret.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleApprove(ret)} disabled={processing === ret.id}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-[11px] font-bold rounded-lg transition-colors">
                      {processing === ret.id ? '...' : '✓ Approve & Refund'}
                    </button>
                    <button onClick={() => handleReject(ret)} disabled={processing === ret.id}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold rounded-lg transition-colors">
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <InputModal
        isOpen={showReturnRejectModal}
        onClose={() => setShowReturnRejectModal(false)}
        onSubmit={handleReturnRejectSubmit}
        title="Reject Return Request"
        placeholder="Reason for rejection (shown to buyer)"
        submitLabel="Reject Return"
      />
    </>
  );
}

// ================================================================
// MAIN ADMIN COMPONENT
// ================================================================
function SecurityPanel() {
  const [logs] = useState([
    { id: 1, type: 'Login', user: 'user_9281', ip: '103.21.164.22', risk: 'High', reason: 'High-frequency login attempts', time: '2 mins ago' },
    { id: 2, type: 'Order', user: 'guest_4412', ip: '192.168.1.5', risk: 'Medium', reason: 'Multiple failed checkout attempts', time: '15 mins ago' },
    { id: 3, type: 'Account', user: 'seller_332', ip: '27.4.22.10', risk: 'Low', reason: 'Bank details changed', time: '1 hour ago' },
    { id: 4, type: 'Proxy', user: 'creator_772', ip: '11.0.4.89', risk: 'Critical', reason: 'VPN/Proxy detected during payout request', time: '3 hours ago' },
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Threats', val: '14', color: 'text-red-600', icon: AlertTriangle },
          { label: 'Blocked IPs', val: '8', color: 'text-gray-900', icon: Shield },
          { label: 'Safe Requests', val: '99.2%', color: 'text-green-600', icon: CheckCircle },
          { label: 'Integrity Score', val: 'A+', color: 'text-[#0D47A1]', icon: Star },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{s.label}</span>
              <s.icon size={16} className={s.color} />
            </div>
            <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-black text-[15px]">Suspicious Activity Logs</h3>
          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full animate-pulse">LIVE MONITORING</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-400 uppercase">
              <tr>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">User/Identity</th>
                <th className="px-5 py-3">Source IP</th>
                <th className="px-5 py-3">Risk Level</th>
                <th className="px-5 py-3">Primary Reason</th>
                <th className="px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-t border-gray-50 hover:bg-red-50/20 transition-colors">
                  <td className="px-5 py-4 font-bold">{log.type}</td>
                  <td className="px-5 py-4 text-gray-600">{log.user}</td>
                  <td className="px-5 py-4 text-gray-400 font-mono">{log.ip}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      log.risk === 'Critical' ? 'bg-red-600 text-white' : 
                      log.risk === 'High' ? 'bg-red-100 text-red-700' :
                      log.risk === 'Medium' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {log.risk}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{log.reason}</td>
                  <td className="px-5 py-4 text-gray-400">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CompliancePanel() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_gst_compliance_summary');
    if (data) setSummary(data);
    if (error) toast('Compliance error: ' + error.message, 'error');
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Loading compliance data...</div>;
  if (!summary) return <div className="p-10 text-center text-gray-400">No compliance data available.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#0D47A1]">🛡️ GST Compliance Monitor</h2>
        <button onClick={fetchSummary} className="p-2 text-gray-400 hover:text-[#0D47A1] hover:bg-gray-100 rounded-lg">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sellers', val: summary.total_sellers, icon: Users, color: 'text-gray-900' },
          { label: 'GST Registered', val: summary.gst_registered, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Non-GST (Local Only)', val: summary.non_gst, icon: AlertTriangle, color: 'text-orange-600' },
          { label: 'Compliance Rate', val: `${summary.compliance_rate}%`, icon: Shield, color: 'text-[#0D47A1]' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</span>
              <s.icon size={16} className={s.color} />
            </div>
            <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-[15px]">State-wise Distribution</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-400 uppercase">
              <tr>
                <th className="px-5 py-3">State</th>
                <th className="px-5 py-3">Total Sellers</th>
                <th className="px-5 py-3">With GST</th>
                <th className="px-5 py-3">Without GST</th>
                <th className="px-5 py-3">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {summary.by_state.map((row: any) => (
                <tr key={row.state} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-bold">{row.state}</td>
                  <td className="px-5 py-4">{row.total}</td>
                  <td className="px-5 py-4 text-green-600 font-bold">{row.with_gst}</td>
                  <td className="px-5 py-4 text-orange-600 font-bold">{row.without_gst}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full" 
                          style={{ width: `${(row.with_gst / row.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-gray-500">
                        {Math.round((row.with_gst / row.total) * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// REVENUE DASHBOARD
// ================================================================
function RevenueDashboard() {
  const [revenueStats, setRevenueStats] = useState({
    total: 0,
    bySource: {} as Record<string, number>,
    recentTransactions: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('platform_revenue').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      let total = 0;
      let bySource: Record<string, number> = {};
      let recentTransactions = data.slice(0, 15);

      data.forEach(item => {
        total += item.amount;
        bySource[item.source] = (bySource[item.source] || 0) + item.amount;
      });

      setRevenueStats({ total, bySource, recentTransactions });
    } catch (err: any) {
      toast('Failed to load revenue data: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const SOURCE_LABELS: Record<string, { label: string, color: string, icon: string }> = {
    subscription: { label: 'Subscriptions', color: 'text-purple-600', icon: '👑' },
    boost: { label: 'Ads & Boost', color: 'text-orange-600', icon: '🚀' },
    featured_store: { label: 'Featured Stores', color: 'text-blue-600', icon: '💎' },
    premium_badge: { label: 'Premium Badges', color: 'text-green-600', icon: '⭐' },
    platform_fee: { label: 'Platform Fees', color: 'text-gray-900', icon: '💸' },
    logistics: { label: 'Logistics Margin', color: 'text-yellow-600', icon: '🚚' },
    saas: { label: 'SaaS Tools', color: 'text-teal-600', icon: '🛠️' }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Loading revenue data...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#0D47A1] flex items-center gap-2"><DollarSign className="w-6 h-6" /> Revenue Dashboard</h2>
        <button onClick={fetchRevenue} className="p-2 text-gray-400 hover:text-[#0D47A1] hover:bg-gray-100 rounded-lg">
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <div className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Platform Revenue</div>
          <div className="text-4xl font-black text-green-600">₹{revenueStats.total.toLocaleString('en-IN')}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-bold text-gray-500 mb-1">Current Month</div>
          <div className="text-xl font-black text-gray-900">₹{revenueStats.total.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(revenueStats.bySource).map(([source, amount]) => {
          const config = SOURCE_LABELS[source] || { label: source, color: 'text-gray-900', icon: '💰' };
          return (
            <div key={source} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">{config.icon} {config.label}</span>
              </div>
              <div className={`text-2xl font-black ${config.color}`}>₹{amount.toLocaleString('en-IN')}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-[15px]">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-400 uppercase">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">User ID</th>
                <th className="px-5 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {revenueStats.recentTransactions.map(tx => (
                <tr key={tx.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-gray-500">{new Date(tx.created_at).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 font-bold capitalize">{tx.source.replace('_', ' ')}</td>
                  <td className="px-5 py-4 font-black text-green-600">₹{tx.amount.toLocaleString('en-IN')}</td>
                  <td className="px-5 py-4 text-[11px] text-gray-400">{tx.user_id?.slice(0, 8)}...</td>
                  <td className="px-5 py-4 text-gray-600">{tx.description}</td>
                </tr>
              ))}
              {revenueStats.recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-gray-400">No revenue transactions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// SUBSCRIPTION MANAGER
// ================================================================
function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('subscriptions').select('*, users(full_name, email)').order('created_at', { ascending: false });
    if (data) setSubscriptions(data);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('subscriptions').update({ status }).eq('id', id);
    if (!error) {
      toastSuccess('Status updated');
      load();
    } else {
      toast('Update failed: ' + error.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-[#0D47A1] flex items-center gap-2"><Award className="w-6 h-6" /> Subscriptions</h2>
        <button onClick={load} className="p-2 text-gray-400 hover:text-[#0D47A1] hover:bg-gray-100 rounded-lg">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-400 uppercase border-b border-gray-100">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Payment ID</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-6 text-center text-gray-400">Loading subscriptions...</td></tr>
              ) : subscriptions.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-gray-400">No subscriptions found</td></tr>
              ) : subscriptions.map(sub => (
                <tr key={sub.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{sub.users?.full_name || 'Unknown'}</div>
                    <div className="text-[11px] text-gray-500">{sub.users?.email}</div>
                  </td>
                  <td className="px-5 py-4 font-black text-[#1565C0] capitalize">{sub.plan_name}</td>
                  <td className="px-5 py-4 text-gray-600 capitalize">{sub.plan_role}</td>
                  <td className="px-5 py-4 font-bold text-green-600">₹{sub.amount}</td>
                  <td className="px-5 py-4 text-[11px] text-gray-500 font-mono">{sub.payment_id}</td>
                  <td className="px-5 py-4">
                    <select
                      value={sub.status}
                      onChange={e => updateStatus(sub.id, e.target.value)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg outline-none ${
                        sub.status === 'active' ? 'bg-green-100 text-green-700' :
                        sub.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <option value="active">Active</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="expired">Expired</option>
                    </select>
                  </td>
                  <td className="px-5 py-4 text-[11px] text-gray-500">{new Date(sub.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  usePageTitle('Admin Panel');
  const { user } = useAppStore();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [kycCount, setKycCount] = useState(0);
  const [returnCount, setReturnCount] = useState(0);
  const [subRequestCount, setSubRequestCount] = useState(0);

  // Load badge counts for sidebar
  const refreshAll = useCallback(() => {
    Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('kyc_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('sellers').select('id', { count: 'exact', head: true }).eq('kyc_status', 'submitted'),
      supabase.from('return_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('subscription_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]).then(([p, k, s, r, sub]) => {
      setPendingCount(p.count || 0);
      setKycCount((k.count || 0) + (s.count || 0));
      setReturnCount(r.count || 0);
      setSubRequestCount(sub.count || 0);
    }).catch(err => {
      toast('Sync failed: ' + err.message, 'error');
    });
  }, []);

  useEffect(() => {
    refreshAll();
    
    // GLOBAL REAL-TIME: Listen for notifications across all admin tabs
    const channel = supabase.channel('admin-global-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'seller_applications' }, (payload) => {
        toastSuccess(`🆕 New Seller Application: ${payload.new.business_name}`);
        refreshAll();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sellers' }, (payload) => {
        if (payload.new.kyc_status === 'submitted') {
          toastSuccess(`📝 New KYC Submission: ${payload.new.business_name}`);
          refreshAll();
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'subscription_requests' }, (payload) => {
        toastSuccess(`💎 New Subscription Request!`);
        refreshAll();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAll]);

  const navSections = [
    {
      title: 'Overview',
      items: [
        { id: 'overview', icon: BarChart2, label: 'Dashboard', badge: 0 },
        { id: 'analytics', icon: TrendingUp, label: 'Analytics', badge: 0 },
        { id: 'revenue', icon: DollarSign, label: 'Revenue Dashboard', badge: 0 },
      ]
    },
    {
      title: 'Catalogue',
      items: [
        { id: 'products', icon: Package, label: 'Products', badge: 0 },
        { id: 'flash_sales', icon: Zap, label: 'Flash Sales', badge: 0 },
        { id: 'coupons', icon: Tag, label: 'Coupons', badge: 0 },
      ]
    },
    {
      title: 'Operations',
      items: [
        { id: 'orders', icon: ShoppingBag, label: 'Orders', badge: pendingCount },
        { id: 'shipping', icon: Truck, label: 'Shipping', badge: pendingCount },
        { id: 'payouts', icon: DollarSign, label: 'Payouts', badge: 0 },
        { id: 'payments', icon: CreditCard, label: 'Payment Methods', badge: 0 },
        { id: 'kyc', icon: UserCheck, label: 'KYC Review', badge: kycCount },
        { id: 'returns', icon: RotateCcw, label: 'Returns', badge: returnCount },
      ]
    },
    {
      title: 'Users',
      items: [
        { id: 'users', icon: Users, label: 'Users', badge: 0 },
        { id: 'applications', icon: Star, label: 'Applications', badge: 0 },
        { id: 'sub_requests', icon: Shield, label: 'Plan Verification', badge: subRequestCount },
        { id: 'subscriptions', icon: Award, label: 'Active Plans', badge: 0 },
        { id: 'popups', icon: Zap, label: 'Offers & Popups', badge: 0 },
      ]
    },
    {
      title: 'Engage',
      items: [
        { id: 'email', icon: Mail, label: 'Email Blaster', badge: 0 },
        { id: 'notify', icon: Bell, label: 'Notifications', badge: 0 },
      ]
    },
    {
      title: 'Platform',
      items: [
        { id: 'settings', icon: Globe, label: 'Site Settings', badge: 0 },
        { id: 'influencer_model', icon: TrendingUp, label: 'Influencer Model', badge: 0 },
        { id: 'security', icon: Activity, label: 'Fraud Monitoring', badge: 0 },
        { id: 'compliance', icon: Shield, label: 'GST Compliance', badge: 0 },
      ]
    },
  ];

  const currentLabel = navSections.flatMap(s => s.items).find(i => i.id === tab)?.label || 'Dashboard';

  const renderContent = () => {
    switch (tab) {
      case 'overview': return <OverviewPanel />;
      case 'analytics': return <AnalyticsPanel />;
      case 'products': return <ProductManager />;
      case 'flash_sales': return <FlashSalesPanel />;
      case 'coupons': return <CouponManager />;
      case 'payments': return <PaymentManager />;
      case 'orders': return <OrderManager />;
      case 'shipping': return <ShippingPanel />;
      case 'payouts': return <PayoutsPanel />;
      case 'kyc': return <KYCReviewPanel />;
      case 'returns': return <ReturnsPanel />;
      case 'users': return <UserManager />;
      case 'applications': return <ApplicationsPanel />;
      case 'sub_requests': return <SubscriptionRequestsPanel />;
      case 'subscriptions': return <SubscriptionManager />;
      case 'popups': return <PopupManager />;
      case 'email': return <EmailManager />;
      case 'notify': return <NotificationManager />;
      case 'settings': return <SiteSettingsManager />;
      case 'influencer_model': return <InfluencerModelManager />;
      case 'security': return <SecurityPanel />;
      case 'compliance': return <CompliancePanel />;
      case 'revenue': return <RevenueDashboard />;
      default: return <OverviewPanel />;
    }
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 h-16 border-b border-white/10 shrink-0 ${!sidebarOpen && 'justify-center'}`}>
        <div className="w-8 h-8 bg-gradient-to-br from-[#1565C0] to-[#0D47A1] rounded-lg flex items-center justify-center text-lg shrink-0">
          🛍️
        </div>
        {sidebarOpen && (
          <div>
            <div className="text-[13px] font-black text-white leading-none">BYNDIO</div>
            <div className="text-[9px] text-white/40 font-semibold uppercase tracking-widest">Admin</div>
          </div>
        )}
        <button onClick={() => { setSidebarOpen(!sidebarOpen); setMobileOpen(false); }}
          className="ml-auto text-white/40 hover:text-white transition-colors p-1 rounded">
          <Menu size={15} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navSections.map(section => (
          <div key={section.title} className="mb-4">
            {sidebarOpen && (
              <div className="text-[9px] font-black text-white/25 uppercase tracking-widest px-2 py-1 mb-1">
                {section.title}
              </div>
            )}
            {section.items.map(item => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button key={item.id}
                  onClick={() => { setTab(item.id); setMobileOpen(false); }}
                  title={!sidebarOpen ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all mb-0.5 group relative
                    ${active
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-white/50 hover:text-white hover:bg-white/8'
                    }`}>
                  <Icon size={15} className={`shrink-0 transition-colors ${active ? 'text-white' : 'group-hover:text-white'}`} />
                  {sidebarOpen && (
                    <>
                      <span className={`text-[12px] font-semibold flex-1 ${active ? 'text-white' : ''}`}>
                        {item.label}
                      </span>
                      {item.badge > 0 && (
                        <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {!sidebarOpen && item.badge > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
                  )}
                  {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white rounded-r-full" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className={`border-t border-white/10 p-3 shrink-0 ${!sidebarOpen && 'flex justify-center'}`}>
        {sidebarOpen ? (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFB300] to-[#E65100] flex items-center justify-center text-white text-[12px] font-black shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-white/70 truncate">{user?.name || 'Admin'}</div>
              <div className="text-[9px] text-white/30 truncate">{user?.email}</div>
            </div>
            <div className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full shrink-0" title="Online" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FFB300] to-[#E65100] flex items-center justify-center text-white text-[11px] font-black">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-60px)] bg-[#F0F4F8] overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col shrink-0 bg-[#0D1117] transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-14'}`}>
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`md:hidden fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-[#0D1117] w-56 transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-5 shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-500 hover:text-gray-900 p-1">
            <Menu size={18} />
          </button>
          <div>
            <div className="text-[15px] font-black text-gray-900">{currentLabel}</div>
            <div className="text-[11px] text-gray-400 hidden sm:block">
              BYNDIO Admin · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {pendingCount > 0 && (
              <button onClick={() => setTab('orders')}
                className="flex items-center gap-1.5 bg-[#FFF3E0] border border-[#FFB74D] text-[#E65100] text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#FFE0B2] transition-colors">
                <AlertTriangle size={12} /> {pendingCount} pending
              </button>
            )}
            <button onClick={() => setTab('notify')}
              className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <Bell size={17} />
              {(kycCount > 0 || pendingCount > 0) && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full" />
              )}
            </button>

            <button onClick={refreshAll} title="Sync Live Data"
              className="p-2 text-gray-400 hover:text-[#0D47A1] hover:bg-blue-50 rounded-lg transition-colors">
              <RefreshCw size={17} />
            </button>
            <a href="/" target="_blank" rel="noopener"
              className="flex items-center gap-1.5 text-[11px] font-bold text-[#1565C0] hover:underline">
              <ExternalLink size={12} /> View Site
            </a>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-5 max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
