import { useState, useEffect, useRef } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Link } from 'react-router-dom';
import { 
  ShoppingBag, BarChart2, Package, Tag, DollarSign, TrendingUp, Star, 
  Megaphone, Settings, Plus, X, Upload, Trophy, Shield, Check, 
  Users, Bell, CreditCard, ChevronRight, Eye, Trash2, Edit, ShieldCheck 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { initiateSubscriptionPayment } from '../lib/subscriptionPayment';
import { getOptimizedImageUrl } from '../lib/images';
import { toast, toastSuccess } from '../components/Toast';
import { useAppStore } from '../store';
import BulkUpload from '../components/BulkUpload';
import { generateGSTInvoice } from '../lib/gstInvoice';
import { INDIAN_STATES } from '../lib/gstCompliance';
import InputModal from '../components/InputModal';
import imageCompression from 'browser-image-compression'; // H-11

function BrandCampaignsPanel() {
  const [showAdd, setShowAdd] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const { user } = useAppStore();

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    // L-09: Fetch real campaigns from DB
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (data) setCampaigns(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xl font-black text-[#0D47A1]">🎯 Influencer Campaigns</div>
        <button onClick={() => setShowAdd(true)} className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-xl font-black text-sm shadow-lg shadow-blue-100 flex items-center gap-2">
          <Plus size={18} /> Post New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Campaigns', val: '2', icon: Star, color: 'text-blue-600' },
          { label: 'Total Applicants', val: '22', icon: Users, color: 'text-purple-600' },
          { label: 'Total Payouts', val: '₹45k', icon: DollarSign, color: 'text-green-600' },
          { label: 'Reach (Est)', val: '1.2M', icon: TrendingUp, color: 'text-[#F57C00]' },
        ].map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</span>
                <s.icon size={16} className={s.color} />
             </div>
             <div className="text-2xl font-black text-gray-900">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-black text-[15px]">Manage Campaigns</h3>
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Post campaigns to reach 500+ influencers</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-gray-50 text-[11px] font-bold text-gray-400 uppercase">
              <tr>
                <th className="px-5 py-3">Campaign Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Fixed Budget</th>
                <th className="px-5 py-3">Commission %</th>
                <th className="px-5 py-3">Applicants</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-bold">{c.title}</td>
                  <td className="px-5 py-4 text-gray-600">{c.category}</td>
                  <td className="px-5 py-4 text-gray-900 font-black">{c.budget}</td>
                  <td className="px-5 py-4 text-[#0D47A1] font-bold">{c.commission}</td>
                  <td className="px-5 py-4 font-bold">{c.applicants} influencers</td>
                  <td className="px-5 py-4"><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">{c.status}</span></td>
                  <td className="px-5 py-4">
                    <button className="text-[#0D47A1] font-bold hover:underline">View Apps</button>
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

export default function Dashboard() {
  usePageTitle('Seller Dashboard');
  const { user } = useAppStore();
  const [tab, setTab] = useState('overview');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // FIX #5: Edit product state
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [showEditProduct, setShowEditProduct] = useState(false);

  // FIX #2: Store info state
  const [storeInfo, setStoreInfo] = useState({ store_name: '', business_email: '', support_phone: '', store_location: '', subscription_plan: 'free' });
  const [isSavingStore, setIsSavingStore] = useState(false);

  // FIX #2: Bank details state
  const [bankDetails, setBankDetails] = useState({ account_holder: '', account_number: '', ifsc: '', bank_name: '' });
  const [isSavingBank, setIsSavingBank] = useState(false);

  // FIX #2: KYC state
  const [kycData, setKycData] = useState({ gst_number: '', pan_number: '', business_name: '', business_address: '', state: '', kyc_documents: [] as string[] });
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [isSavingKyc, setIsSavingKyc] = useState(false);
  const [kycStep, setKycStep] = useState(1);

  // FIX #4: Withdraw state
  const [walletBalance, setWalletBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // AWB Input Modal state
  const [showAwbModal, setShowAwbModal] = useState(false);
  const [awbOrderId, setAwbOrderId] = useState<string | null>(null);

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    mrp: '',
    category: 'Electronics',
    stock_quantity: '10',
    commission_pct: '10',
    images: [] as string[],
    promo_video_url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adClicks, setAdClicks] = useState(0); // L-08
  const [lowStockItems, setLowStockItems] = useState<any[]>([]); // H-12

  // H-11: Image Compression Helper
  const compressImage = async (file: File) => {
    const options = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Compression error:', error);
      return file;
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsBulkUploading(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const productsToInsert = [];
      
      // Basic CSV parser (Name, Price, MRP, Stock, Category, Description)
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < 5) continue;
        
        productsToInsert.push({
          seller_id: user.id,
          name: row[0].trim(),
          price: parseFloat(row[1]) || 0,
          mrp: parseFloat(row[2]) || 0,
          stock_quantity: parseInt(row[3]) || 0,
          category: row[4].trim() || 'General',
          description: row[5]?.trim() || '',
          images: ['📦'],
          commission_pct: 10,
          is_active: true
        });
      }
      
      if (productsToInsert.length > 0) {
        const { error } = await supabase.from('products').insert(productsToInsert);
        if (error) throw error;
        toastSuccess(`${productsToInsert.length} products uploaded successfully!`);
        fetchDashboardData();
      }
    } catch (err: any) {
      toast(err.message || 'Bulk upload failed', 'error');
    } finally {
      setIsBulkUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const kycFileInputRef = useRef<HTMLInputElement>(null);

  const handleKycUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    
    setImgUploading(true);
    try {
      const uploadedUrls = [...kycData.kyc_documents];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 5 * 1024 * 1024) {
          toast(`File ${file.name} is too large (max 5MB)`, 'error');
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
        const filePath = fileName; // Upload directly to user-id folder

        const { error: uploadError } = await supabase.storage
          .from('seller-documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('seller-documents')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      setKycData(prev => ({ ...prev, kyc_documents: uploadedUrls }));
      toastSuccess('Documents uploaded successfully!');
    } catch (err: any) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setImgUploading(false);
      if (kycFileInputRef.current) kycFileInputRef.current.value = '';
    }
  };
  useEffect(() => {
    if (user && (user.role === 'seller' || user.role === 'admin')) {
      fetchDashboardData();
      loadSellerSettings();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const loadSellerSettings = async () => {
    if (!user) return;
    let { data } = await supabase.from('sellers').select('*').eq('id', user.id).maybeSingle();
    
    // AUTO-INITIALIZE: If user is a seller but has no profile record yet
    if (!data) {
      const { data: newData, error } = await supabase.from('sellers').insert({
        id: user.id,
        business_name: user.name || 'New Store',
        category: 'Fashion & Clothing',
        is_verified: false,
        kyc_status: 'pending'
      }).select().single();
      if (!error) data = newData;
    }

    if (data) {
      setKycStatus(data.kyc_status || 'not_submitted');
      setStoreInfo({
        store_name: data.business_name || '',
        business_email: user.email || '',
        support_phone: '',
        store_location: data.business_address || '',
        subscription_plan: data.subscription_plan || 'free',
      });
      setBankDetails({
        account_holder: user.name || '',
        account_number: data.bank_account_number || '',
        ifsc: data.ifsc_code || '',
        bank_name: '',
      });
      setKycData({
        gst_number: data.gst_number || '',
        pan_number: data.pan_number || '',
        business_name: data.business_name || '',
        business_address: data.business_address || '',
        state: data.business_state || data.state || '',
        kyc_documents: data.kyc_documents || []
      });
    }
    const { data: wallet } = await supabase.from('wallets').select('balance, pending_balance').eq('user_id', user.id).maybeSingle();
    setWalletBalance(wallet?.balance || 0);
    setPendingBalance(wallet?.pending_balance || 0);

    // L-08: Fetch real ad clicks
    const { count: clicks } = await supabase.from('referral_analytics').select('*', { count: 'exact', head: true }).eq('seller_id', user.id);
    setAdClicks(clicks || 0);

    // H-12: Low Stock Alerts
    const { data: lowStock } = await supabase.from('products')
      .select('id, name, stock_quantity')
      .eq('seller_id', user.id)
      .lte('stock_quantity', 5)
      .gt('stock_quantity', 0);
    setLowStockItems(lowStock || []);
  };

  const handleAwbSubmit = async (awb: string) => {
    if (!awbOrderId || !user) return;
    
    // C-11: Seller Updates Any Order — Secure handoff to Netlify function
    // The server-side function verifies the JWT and checks order_items.seller_id ownership.
    try {
      const response = await fetch('/api/update-order-awb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          orderId: awbOrderId,
          trackingAwb: awb.trim(),
          courierName: 'Shiprocket'
        })
      });

      const result = await response.json();
      if (response.ok) {
        toastSuccess(`AWB ${awb.trim()} saved. Order marked as Shipped.`); 
        fetchDashboardData(); 
      } else {
        throw new Error(result.error || 'Failed to update tracking');
      }
    } catch (err: any) {
      toast(err.message, 'error');
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch Products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (productsError) throw productsError;
      if (productsData) setProducts(productsData);

      // Fetch Orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          price,
          created_at,
          orders ( id, status, buyer_id, shipping_address ),
          products ( name, images )
        `)
        .eq('seller_id', user?.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      if (ordersData) setOrders(ordersData);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      toast('Failed to load dashboard: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      const price = parseFloat(newProduct.price);
      const mrp = parseFloat(newProduct.mrp);
      const stock = parseInt(newProduct.stock_quantity);
      if (isNaN(price) || price <= 0) throw new Error('Enter a valid price');
      if (isNaN(mrp) || mrp < price) throw new Error('MRP must be ≥ price');
      if (isNaN(stock) || stock < 0) throw new Error('Enter a valid stock quantity');

      // H-09: Product Approval Workflow
      // REMINDER: Products.tsx must also filter .eq('approval_status', 'approved') on public listings — handled in Session 8
      const { error } = await supabase.from('products').insert({
        seller_id: user.id,
        name: newProduct.name.trim(),
        description: newProduct.description.trim(),
        price,
        mrp,
        category: newProduct.category,
        stock_quantity: stock,
        commission_pct: parseInt(newProduct.commission_pct) || 10,
        images: newProduct.images.length > 0 ? newProduct.images : ['📦'],
        promo_video_url: newProduct.promo_video_url?.trim() || null,
        is_active: false, // Default to inactive until approved
        approval_status: 'pending', // Requires admin review (H-09)
      });

      if (error) throw error;

      setShowAddProduct(false);
      setNewProduct({ name: '', description: '', price: '', mrp: '', category: 'Electronics', stock_quantity: '10', commission_pct: '10', images: [], promo_video_url: '' });
      fetchDashboardData();
    } catch (err: any) {
      toast(err.message || 'Failed to add product. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // FIX #2: Save store info to DB
  const handleSaveStore = async () => {
    if (!user) return;
    setIsSavingStore(true);
    try {
      const { error } = await supabase.from('sellers').upsert({
        id: user.id,
        business_name: storeInfo.store_name.trim() || `${user.name}'s Store`,
        business_address: storeInfo.store_location.trim(),
        state: kycData.state, // Sync state from kycData
        business_state: kycData.state, // GST Compliance field
      }, { onConflict: 'id' });
      // Also update the users table for email/phone (best-effort)
      await supabase.from('users').update({
        full_name: storeInfo.store_name.trim() || user.name,
      }).eq('id', user.id);
      if (error) throw error;
      toastSuccess('Store settings saved successfully!');
    } catch (err: any) {
      toast(err.message || 'Failed to save store settings.', 'error');
    } finally {
      setIsSavingStore(false);
    }
  };

  // FIX #2: Save bank details to DB
  const handleSaveBank = async () => {
    if (!user) return;
    setIsSavingBank(true);
    try {
      const { error } = await supabase.from('sellers').upsert({
        id: user.id,
        bank_account_number: bankDetails.account_number.trim(),
        ifsc_code: bankDetails.ifsc.trim().toUpperCase(),
        business_name: storeInfo.store_name.trim() || `${user.name}'s Store`,
      }, { onConflict: 'id' });
      if (error) throw error;
      toastSuccess('Bank details saved successfully!');
    } catch (err: any) {
      toast(err.message || 'Failed to save bank details.', 'error');
    } finally {
      setIsSavingBank(false);
    }
  };

  // FIX #2: Save KYC details to DB
  const handleSaveKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!kycData.business_name || !kycData.pan_number || !kycData.business_address) {
      toast('Please fill in all mandatory KYC fields', 'error');
      return;
    }
    setIsSavingKyc(true);
    try {
      const { error } = await supabase.from('sellers').upsert({
        id: user.id,
        business_name: kycData.business_name.trim(),
        business_address: kycData.business_address.trim(),
        gst_number: kycData.gst_number.trim().toUpperCase(),
        pan_number: kycData.pan_number.trim().toUpperCase(),
        kyc_status: 'submitted',
      }, { onConflict: 'id' });
      if (error) throw error;
      setKycStatus('submitted');
      toastSuccess('KYC details submitted for verification! Admin will review it soon.');
    } catch (err: any) {
      toast(err.message || 'Failed to submit KYC.', 'error');
    } finally {
      setIsSavingKyc(false);
    }
  };

  // FIX #4: Submit real withdrawal request to DB
  const handleWithdraw = async () => {
    if (!user) return;
    if (walletBalance <= 0) { toast('No balance available to withdraw.', 'error'); return; }
    setIsWithdrawing(true);
    try {
      const { error } = await supabase.from('withdrawal_requests').insert({
        user_id: user.id,
        amount: walletBalance,
        status: 'pending',
        requested_at: new Date().toISOString(),
      });
      if (error) throw error;
      toastSuccess(`Withdrawal of ₹${walletBalance.toLocaleString('en-IN')} requested! Funds arrive in 7 working days.`);
    } catch (err: any) {
      toast(err.message || 'Failed to submit withdrawal request.', 'error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // FIX #5: Edit product — save changes to DB
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !user) return;
    setIsSubmitting(true);
    try {
      const price = parseFloat(editingProduct.price);
      const mrp = parseFloat(editingProduct.mrp);
      const stock = parseInt(editingProduct.stock_quantity);
      if (isNaN(price) || price <= 0) throw new Error('Enter a valid price');
      if (isNaN(mrp) || mrp < price) throw new Error('MRP must be ≥ price');
      if (isNaN(stock) || stock < 0) throw new Error('Enter a valid stock quantity');

      // SECURITY: Verify ownership before update
      const { data: existingProduct } = await supabase
        .from('products')
        .select('seller_id')
        .eq('id', editingProduct.id)
        .maybeSingle();
      
      if (!existingProduct || existingProduct.seller_id !== user.id) {
        throw new Error('You can only edit your own products');
      }

      const { error } = await supabase.from('products').update({
        name: editingProduct.name.trim(),
        description: editingProduct.description?.trim() || '',
        price,
        mrp,
        category: editingProduct.category,
        stock_quantity: stock,
        commission_pct: parseInt(editingProduct.commission_pct) || 10,
        images: editingProduct.images.length > 0 ? editingProduct.images : ['📦'],
        promo_video_url: editingProduct.promo_video_url?.trim() || null,
      }).eq('id', editingProduct.id).eq('seller_id', user.id);

      if (error) throw error;

      setShowEditProduct(false);
      setEditingProduct(null);
      fetchDashboardData();
      toastSuccess('Product updated successfully!');
    } catch (err: any) {
      toast(err.message || 'Failed to update product.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const navItems = [
    { id: 'overview', icon: BarChart2, label: 'Overview', locked: kycStatus !== 'approved' },
    { id: 'products', icon: Tag, label: 'My Products', locked: kycStatus !== 'approved' },
    { id: 'orders', icon: Package, label: 'Orders', locked: kycStatus !== 'approved' },
    { id: 'earnings', icon: DollarSign, label: 'Earnings', locked: kycStatus !== 'approved' },
    { id: 'ads', icon: Megaphone, label: 'Ads & Boost', locked: kycStatus !== 'approved' },
    { id: 'analytics', icon: TrendingUp, label: 'Analytics', locked: kycStatus !== 'approved' },
    { id: 'campaigns', icon: Star, label: 'Brand Campaigns', locked: kycStatus !== 'approved' },
    { id: 'kyc', icon: Shield, label: 'KYC Status' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  // Map icons for safety
  const IconMap: Record<string, any> = { Shield };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': case 'active': case 'approved': return 'bg-[#E8F5E9] text-[#2E7D32]';
      case 'shipped': case 'pending': case 'submitted': return 'bg-[#E3F2FD] text-[#0D47A1]';
      case 'processing': case 'low stock': return 'bg-[#FFF3E0] text-[#E65100]';
      case 'returned': case 'rejected': return 'bg-[#FFEBEE] text-[#C62828]';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0D47A1]"></div></div>;
    }

    // If KYC not approved, redirect some tabs to KYC
    const isLocked = navItems.find(n => n.id === tab)?.locked;
    const activeTab = (isLocked && kycStatus !== 'approved') ? 'kyc' : tab;

    switch (activeTab) {
      case 'kyc':
        if (kycStatus === 'submitted' || kycStatus === 'approved') {
          return (
            <div className="max-w-3xl mx-auto py-12 px-4 text-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-6">
                <ShieldCheck size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">
                {kycStatus === 'approved' ? '✅ Your Store is Verified!' : '⏳ Verification in Progress'}
              </h2>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {kycStatus === 'approved' 
                  ? 'Your identity and business details have been verified. You now have full access to all seller features and payouts.'
                  : 'We have received your KYC documents. Our compliance team is currently reviewing your application. This usually takes 24-48 hours.'}
              </p>
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-left">
                <h3 className="text-sm font-bold text-gray-900 mb-4">Submitted Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PAN Number</div>
                    <div className="text-xs font-bold text-gray-900">{kycData.pan_number}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">GST Number</div>
                    <div className="text-xs font-bold text-gray-900">{kycData.gst_number || 'Not Provided'}</div>
                  </div>
                </div>
                {kycData.kyc_documents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Linked Documents</div>
                    <div className="flex flex-wrap gap-2">
                      {kycData.kyc_documents.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                          View Document {i + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setTab('overview')} className="mt-8 text-sm font-bold text-[#0D47A1] hover:underline">← Back to Dashboard</button>
            </div>
          );
        }

        return (
          <div className="max-w-4xl mx-auto py-8">
            <div className="text-2xl font-black text-[#0D47A1] mb-2 flex items-center gap-3">
              <Shield className="w-8 h-8" /> Seller KYC Verification
            </div>
            {kycStatus !== 'approved' && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl mb-6 flex items-start gap-3">
                <ShieldCheck size={20} className="text-orange-500 shrink-0 mt-0.5" />
                <div>
                   <p className="text-sm font-black text-orange-800">Verification Required to Start Selling</p>
                   <p className="text-xs text-orange-700 font-medium leading-relaxed">You must complete your KYC verification to access products, orders, and earnings. Verified sellers receive a blue checkmark and 50% more reach.</p>
                </div>
              </div>
            )}
            <p className="text-gray-500 mb-8 font-medium text-sm">As per BYNDIO policy, sellers must complete KYC verification before listing products. This ensures a safe marketplace for everyone.</p>

            {kycStatus === 'approved' ? (
              <div className="bg-[#E8F5E9] border-2 border-[#2E7D32] p-8 rounded-[24px] text-center shadow-sm">
                <div className="w-20 h-20 bg-[#2E7D32] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={40} />
                </div>
                <h3 className="text-2xl font-black text-[#1B5E20] mb-2">Verification Successful!</h3>
                <p className="text-[#2E7D32] font-bold mb-6">Your seller account is active. You can now list products and receive orders.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-3xl mx-auto mt-8 border-t border-[#A5D6A7] pt-8">
                   <div>
                     <div className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Store Name</div>
                     <div className="text-green-900 font-bold">{storeInfo.store_name}</div>
                   </div>
                   <div>
                     <div className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Bank Account</div>
                     <div className="text-green-900 font-bold">{bankDetails.account_number ? '****' + bankDetails.account_number.slice(-4) : 'N/A'}</div>
                   </div>
                   <div>
                     <div className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">PAN Number</div>
                     <div className="text-green-900 font-bold">{kycData.pan_number || 'N/A'}</div>
                   </div>
                </div>
                <button onClick={() => setTab('overview')} className="bg-[#2E7D32] text-white px-8 py-3 rounded-xl font-black shadow-lg mt-8 inline-block hover:scale-105 transition-transform">Go to Overview</button>
              </div>
            ) : kycStatus === 'submitted' ? (
              <div className="bg-[#E3F2FD] border-2 border-[#1565C0] p-8 rounded-[24px] text-center shadow-sm">
                <div className="w-20 h-20 bg-[#1565C0] text-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp size={40} />
                </div>
                <h3 className="text-2xl font-black text-[#0D47A1] mb-2">Verification in Progress</h3>
                <p className="text-[#1565C0] font-bold mb-2">We have received your complete KYC application.</p>
                <p className="text-[#1565C0]/70 text-sm max-w-lg mx-auto">Our admin team is currently verifying your store details, bank information, and documents. This usually takes 24-48 business hours.</p>
              </div>
            ) : (
              <div className="bg-white rounded-[32px] shadow-xl shadow-blue-900/5 border border-gray-100 overflow-hidden">
                {/* Stepper Header */}
                <div className="flex bg-gray-50/50 border-b border-gray-100">
                  {[ 
                    { id: 1, name: 'Store Details', icon: '🏪' }, 
                    { id: 2, name: 'Bank Account', icon: '🏦' }, 
                    { id: 3, name: 'KYC Documents', icon: '📄' } 
                  ].map(step => (
                    <div key={step.id} className={`flex-1 p-4 md:p-5 flex flex-col items-center justify-center gap-1 border-b-2 transition-all ${
                      kycStep === step.id ? 'border-[#0D47A1] bg-white text-[#0D47A1]' : 
                      kycStep > step.id ? 'border-green-500 text-green-600 bg-green-50/30' : 'border-transparent text-gray-400'
                    }`}>
                      <div className="text-xl md:text-2xl">{kycStep > step.id ? '✅' : step.icon}</div>
                      <div className="text-[10px] md:text-xs font-black uppercase tracking-widest text-center hidden sm:block">Step {step.id}: {step.name}</div>
                    </div>
                  ))}
                </div>
                
                {/* Stepper Body */}
                <div className="p-6 md:p-10">
                  {kycStep === 1 && (
                    <div className="space-y-6">
                      <div className="mb-6">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">🏪 Store & Contact Information</h3>
                        <p className="text-sm text-gray-500">Provide your basic business details so customers and our team can reach you.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Store / Business Name *</label>
                          <input required value={storeInfo.store_name} onChange={e => { setStoreInfo({...storeInfo, store_name: e.target.value}); setKycData({...kycData, business_name: e.target.value}); }} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[#0D47A1] focus:bg-white outline-none font-bold text-gray-900 transition-all placeholder:font-medium" placeholder="E.g., Byndio Official Store" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Business Email *</label>
                          <input required type="email" value={storeInfo.business_email} onChange={e => setStoreInfo({...storeInfo, business_email: e.target.value})} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[#0D47A1] focus:bg-white outline-none font-bold text-gray-900 transition-all placeholder:font-medium" placeholder="store@example.com" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Support Phone Number *</label>
                          <input required type="tel" value={storeInfo.support_phone} onChange={e => setStoreInfo({...storeInfo, support_phone: e.target.value})} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[#0D47A1] focus:bg-white outline-none font-bold text-gray-900 transition-all placeholder:font-medium" placeholder="+91 98765 43210" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Complete Store / Business Address *</label>
                          <textarea required rows={3} value={storeInfo.store_location} onChange={e => { setStoreInfo({...storeInfo, store_location: e.target.value}); setKycData({...kycData, business_address: e.target.value}); }} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[#0D47A1] focus:bg-white outline-none font-bold text-gray-900 transition-all placeholder:font-medium resize-none" placeholder="Include Building, Street, City, State, and Pincode" />
                        </div>
                      </div>
                      <div className="flex justify-end pt-6 border-t border-gray-100">
                        <button onClick={() => {
                          if (!storeInfo.store_name || !storeInfo.business_email || !storeInfo.store_location) { toast('Please fill all required store details', 'error'); return; }
                          setKycStep(2);
                        }} className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-blue-200 transition-all">Next: Bank Account →</button>
                      </div>
                    </div>
                  )}

                  {kycStep === 2 && (
                    <div className="space-y-6">
                      <div className="mb-6">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">🏦 Bank Account for Payouts</h3>
                        <p className="text-sm text-gray-500">Provide the bank account where your sales earnings will be deposited.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Account Holder Name *</label>
                          <input required value={bankDetails.account_holder} onChange={e => setBankDetails({...bankDetails, account_holder: e.target.value})} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[#0D47A1] focus:bg-white outline-none font-bold text-gray-900 transition-all placeholder:font-medium" placeholder="Full name exactly as per bank records" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Account Number *</label>
                          <input required value={bankDetails.account_number} onChange={e => setBankDetails({...bankDetails, account_number: e.target.value})} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[#0D47A1] focus:bg-white outline-none font-bold text-gray-900 transition-all placeholder:font-medium tracking-widest" placeholder="0000 0000 0000" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">IFSC Code *</label>
                          <input required value={bankDetails.ifsc} onChange={e => setBankDetails({...bankDetails, ifsc: e.target.value.toUpperCase()})} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[#0D47A1] focus:bg-white outline-none font-bold text-gray-900 transition-all placeholder:font-medium uppercase" placeholder="HDFC0001234" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">Bank Name *</label>
                          <input required value={bankDetails.bank_name} onChange={e => setBankDetails({...bankDetails, bank_name: e.target.value})} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[#0D47A1] focus:bg-white outline-none font-bold text-gray-900 transition-all placeholder:font-medium" placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India" />
                        </div>
                      </div>
                      <div className="flex justify-between pt-6 border-t border-gray-100">
                        <button onClick={() => setKycStep(1)} className="text-gray-500 hover:text-gray-900 font-bold px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all">← Back</button>
                        <button onClick={() => {
                          if (!bankDetails.account_holder || !bankDetails.account_number || !bankDetails.ifsc || !bankDetails.bank_name) { toast('Please fill all required bank details', 'error'); return; }
                          setKycStep(3);
                        }} className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-blue-200 transition-all">Next: KYC Documents →</button>
                      </div>
                    </div>
                  )}

                  {kycStep === 3 && (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      if (!kycData.pan_number || !kycData.business_name || !kycData.business_address) { toast('Missing required data from step 1 or 3', 'error'); return; }
                      setIsSavingKyc(true);
                      try {
      const { error } = await supabase.from('sellers').upsert({
        id: user.id,
        business_name: kycData.business_name.trim(), 
        business_address: kycData.business_address.trim(),
        bank_account_number: bankDetails.account_number.trim(), 
        ifsc_code: bankDetails.ifsc.trim().toUpperCase(),
        gst_number: kycData.gst_number?.trim().toUpperCase() || null,
        pan_number: kycData.pan_number.trim().toUpperCase(),
        kyc_status: 'submitted',
        kyc_documents: kycData.kyc_documents
      }, { onConflict: 'id' });

                        if (error) throw error;
                        setKycStatus('submitted');
                        toastSuccess('KYC details submitted for verification! Admin will review it soon.');
                      } catch (err: any) {
                        toast(err.message || 'Failed to submit KYC.', 'error');
                      } finally {
                        setIsSavingKyc(false);
                      }
                    }} className="space-y-6">
                      <div className="mb-6">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">📄 KYC Documents</h3>
                        <p className="text-sm text-gray-500">Provide tax and regulation identifiers for BYNDIO marketplace compliance.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">PAN Number *</label>
                          <input required value={kycData.pan_number} onChange={e => setKycData({...kycData, pan_number: e.target.value.toUpperCase()})} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[#0D47A1] focus:bg-white outline-none font-bold text-gray-900 transition-all placeholder:font-medium uppercase tracking-widest" placeholder="ABCDE1234F" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1">GST Number (Required if applicable)</label>
                          <input value={kycData.gst_number} onChange={e => setKycData({...kycData, gst_number: e.target.value.toUpperCase()})} className="w-full px-4 py-3.5 bg-gray-50 rounded-xl border-2 border-transparent focus:border-[#0D47A1] focus:bg-white outline-none font-bold text-gray-900 transition-all placeholder:font-medium uppercase tracking-widest" placeholder="22AAAAA0000A1Z5" />
                        </div>
                        <div className="mt-2">
                          <label className="text-[11px] font-black text-gray-500 uppercase tracking-widest pl-1 block mb-2">Upload PAN / GST Scans</label>
                          <input 
                            type="file" 
                            ref={kycFileInputRef} 
                            onChange={handleKycUpload} 
                            multiple 
                            accept=".pdf,.jpg,.jpeg,.png" 
                            className="hidden" 
                          />
                          <div 
                            onClick={() => kycFileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#0D47A1] hover:bg-blue-50/30 transition-all group"
                          >
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-3 group-hover:scale-110 transition-transform">
                              <Upload size={28} />
                            </div>
                            <div className="text-sm font-bold text-[#0D47A1] mb-1">
                              {imgUploading ? 'Uploading...' : 'Click to securely link documents'}
                            </div>
                            <div className="text-xs text-gray-400">PDF, JPG, PNG — max 5MB per file</div>
                          </div>
                          
                          {/* Document Preview */}
                          {kycData.kyc_documents.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-3">
                              {kycData.kyc_documents.map((url, idx) => (
                                <div key={idx} className="relative group w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                  {url.toLowerCase().endsWith('.pdf') ? (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-red-600">PDF</div>
                                  ) : (
                                    <img src={url} alt="KYC Scan" className="w-full h-full object-cover" />
                                  )}
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setKycData(prev => ({ ...prev, kyc_documents: prev.kyc_documents.filter((_, i) => i !== idx) }));
                                    }}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex gap-3 text-orange-800">
                         <div className="shrink-0 mt-0.5"><Shield size={16} /></div>
                         <div className="text-xs font-medium">By submitting, you declare that all information provided is accurate and agree to the Seller Terms of Conduct.</div>
                      </div>

                      <div className="flex justify-between pt-6 border-t border-gray-100">
                        <button type="button" onClick={() => setKycStep(2)} className="text-gray-500 hover:text-gray-900 font-bold px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all">← Back</button>
                        <button type="submit" disabled={isSavingKyc} className="bg-[#2E7D32] hover:bg-[#1B5E20] disabled:bg-gray-400 text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2">
                          {isSavingKyc ? 'Submitting...' : <><Check size={18}/> Submit Application</>}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'overview':
        return (
          <>
            <div className="text-xl font-black text-[#0D47A1] mb-4 flex items-center gap-2">
              <BarChart2 className="w-6 h-6" /> Seller Overview
            </div>

            {/* GST COMPLIANCE WARNING */}
            {!kycData.gst_number && (
              <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 md:p-5 flex items-start gap-4 shadow-sm">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-100">
                  <Shield size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-orange-900 mb-1 flex items-center gap-2">
                    ⚖️ Intra-State Selling Restriction
                  </h3>
                  <p className="text-xs font-bold text-orange-800 leading-relaxed opacity-80">
                    Under Indian GST law, sellers without a GST registration can only sell products within their own state 
                    <span className="font-black underline mx-1">({kycData.state || 'Maharashtra'})</span>. 
                    Your products will be automatically hidden from buyers outside this state.
                  </p>
                  <button onClick={() => setTab('settings')} className="mt-2.5 text-[10px] font-black text-orange-600 bg-white px-3 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-100 transition-all uppercase tracking-widest shadow-sm">
                    Add GST to sell nationwide
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
              <div className="bg-white rounded-[10px] p-4.5 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[10px] bg-[#E3F2FD] flex items-center justify-center text-[28px] shrink-0">📦</div>
                <div><div className="text-[22px] font-black">₹{orders.reduce((sum, o) => sum + (o.price * o.quantity), 0).toLocaleString('en-IN')}</div><div className="text-xs text-gray-500">Total Revenue</div></div>
              </div>
              <div className="bg-white rounded-[10px] p-4.5 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[10px] bg-[#E8F5E9] flex items-center justify-center text-[28px] shrink-0">🛒</div>
                <div><div className="text-[22px] font-black">{orders.length}</div><div className="text-xs text-gray-500">Total Orders</div></div>
              </div>
              <div className="bg-white rounded-[10px] p-4.5 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[10px] bg-[#FFF3E0] flex items-center justify-center text-[28px] shrink-0">🏷️</div>
                <div><div className="text-[22px] font-black">{products.length}</div><div className="text-xs text-gray-500">Active Products</div></div>
              </div>
              <div className="bg-white rounded-[10px] p-4.5 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[10px] bg-[#F3E5F5] flex items-center justify-center text-[28px] shrink-0">📈</div>
                <div><div className="text-[22px] font-black">{adClicks.toLocaleString()}</div><div className="text-xs text-gray-500">Ad Clicks</div></div>
              </div>
            </div>

            {/* H-12: Low Stock Alerts Section */}
            {lowStockItems.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-5 rounded-r-[10px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <div className="text-sm font-black text-red-800">Low Stock Alert ({lowStockItems.length} items)</div>
                    <p className="text-[11px] text-red-600">These items have 5 or less units remaining. Restock soon to avoid lost sales.</p>
                  </div>
                </div>
                <button onClick={() => setTab('products')} className="text-xs font-black text-red-700 hover:underline">Manage Inventory →</button>
              </div>
            )}

            {/* NEW: Promotion Insights Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="md:col-span-2 bg-white rounded-[10px] shadow-sm p-5 border-l-4 border-[#0D47A1]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[14px] font-black flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#0D47A1]" /> Promoter Performance
                  </h3>
                  <span className="text-[10px] font-bold text-gray-400">AUDIT TRAIL ACTIVE</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                   <div className="text-center">
                     <div className="text-[11px] font-bold text-gray-400 p-1">LINKS</div>
                     <div className="text-[18px] font-black">1.2k</div>
                     <div className="text-[10px] text-[#388E3C] font-bold">Clicks</div>
                   </div>
                   <div className="text-center border-x border-gray-100">
                     <div className="text-[11px] font-bold text-gray-400 p-1">REELS</div>
                     <div className="text-[18px] font-black">5.4k</div>
                     <div className="text-[10px] text-[#388E3C] font-bold">Views</div>
                   </div>
                   <div className="text-center">
                     <div className="text-[11px] font-bold text-gray-400 p-1">CONV.</div>
                     <div className="text-[18px] font-black">3.8%</div>
                     <div className="text-[10px] text-gray-400 font-bold">Ratio</div>
                   </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-[#0D47A1] to-[#1565C0] rounded-[10px] shadow-md p-5 text-white flex flex-col justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Affiliate Pool</div>
                  <div className="text-[16px] font-bold">₹{(orders.reduce((sum, o) => sum + (o.price * o.quantity), 0) * 0.1).toLocaleString('en-IN')}</div>
                </div>
                <div className="text-[10px] font-medium opacity-80 mt-2">Commission budget reserved for promoters.</div>
                <div className="w-full h-1 bg-white/20 rounded-full mt-3 overflow-hidden">
                   <div className="h-full bg-white w-2/3" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[10px] shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-3.5 border-b border-gray-200">
                <span className="text-[15px] font-black">Recent Orders</span>
                <button onClick={() => setTab('orders')} className="text-xs text-[#1565C0] font-bold hover:underline">View All →</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] text-left">
                  <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    <tr><th className="p-3 border-b border-gray-200">Order ID</th><th className="p-3 border-b border-gray-200">Product</th><th className="p-3 border-b border-gray-200">Amount</th><th className="p-3 border-b border-gray-200">Date</th><th className="p-3 border-b border-gray-200">Status</th></tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((o, i) => (
                      <tr key={i} className="hover:bg-blue-50/50">
                        <td className="p-3 border-b border-gray-200 font-bold text-[#1565C0]">{o.orders?.id?.slice(0, 8)}...</td>
                        <td className="p-3 border-b border-gray-200">{o.products?.name || 'Unknown Product'} (x{o.quantity})</td>
                        <td className="p-3 border-b border-gray-200 font-bold">₹{(o.price * o.quantity).toLocaleString('en-IN')}</td>
                        <td className="p-3 border-b border-gray-200">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="p-3 border-b border-gray-200"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(o.orders?.status || 'Pending')}`}>{o.orders?.status || 'Pending'}</span></td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-gray-500">No orders yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      case 'orders':
        return (
          <>
            <div className="text-xl font-black text-[#0D47A1] mb-4">📦 Orders</div>
            <div className="bg-white rounded-[10px] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] text-left">
                  <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    <tr><th className="p-3 border-b border-gray-200">Order ID</th><th className="p-3 border-b border-gray-200">Product</th><th className="p-3 border-b border-gray-200">Amount</th><th className="p-3 border-b border-gray-200">Date</th><th className="p-3 border-b border-gray-200">Status</th><th className="p-3 border-b border-gray-200">Action</th></tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <tr key={i} className="hover:bg-blue-50/50">
                        <td className="p-3 border-b border-gray-200 font-bold text-[#1565C0]">{o.orders?.id?.slice(0, 8)}...</td>
                        <td className="p-3 border-b border-gray-200">{o.products?.name || 'Unknown Product'} (x{o.quantity})</td>
                        <td className="p-3 border-b border-gray-200 font-bold">₹{(o.price * o.quantity).toLocaleString('en-IN')}</td>
                        <td className="p-3 border-b border-gray-200">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="p-3 border-b border-gray-200"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(o.orders?.status || 'Pending')}`}>{o.orders?.status || 'Pending'}</span></td>
                        <td className="p-3 border-b border-gray-200">
                          <button onClick={async () => {
                            // Fetch tracking info from orders table
                            const { data: orderRow } = await supabase
                              .from('orders')
                              .select('tracking_url, tracking_awb, status')
                              .eq('id', o.orders?.id)
                              .maybeSingle();
                            if (orderRow?.tracking_url) {
                              window.open(orderRow.tracking_url, '_blank');
                            } else if (orderRow?.tracking_awb) {
                              window.open(`https://shiprocket.co/tracking/${orderRow.tracking_awb}`, '_blank');
                            } else {
                              setAwbOrderId(o.orders?.id || null);
                              setShowAwbModal(true);
                            }
                          }} className="text-[11px] text-[#1565C0] font-bold hover:underline mr-2">Track</button>
                          <button onClick={async () => {
                            await generateGSTInvoice({
                              orderId: o.orders?.id || 'N/A',
                              orderDate: o.created_at,
                              buyerName: o.orders?.shipping_address?.fullName || 'Customer',
                              buyerAddress: `${o.orders?.shipping_address?.line1 || ''}, ${o.orders?.shipping_address?.city || ''}`,
                              sellerName: user?.name || 'Seller',
                              sellerGST: 'N/A',
                              items: [{ name: o.products?.name || 'Product', qty: o.quantity, price: o.price, gstRate: 18, hsn: '6203' }],
                              shippingFee: 0,
                              platformFee: 10,
                              totalAmount: o.price * o.quantity,
                            });
                          }} className="text-[11px] text-[#388E3C] font-bold hover:underline">Invoice</button>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan={6} className="p-4 text-center text-gray-500">No orders yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      case 'products':
        return (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-xl font-black text-[#0D47A1]">🏷️ My Products</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowBulkUpload(true)}
                  className="flex items-center gap-1.5 bg-white hover:bg-gray-50 border-2 border-[#0D47A1] text-[#0D47A1] px-3 py-2 rounded-md font-bold text-sm transition-colors">
                  <Upload size={15} /> Bulk CSV
                </button>
                <input 
                  type="file" accept=".csv" ref={fileInputRef} className="hidden" 
                  onChange={handleBulkUpload} 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBulkUploading}
                  className="bg-white border border-[#0D47A1] text-[#0D47A1] hover:bg-blue-50 px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus size={16} /> {isBulkUploading ? 'Uploading...' : 'Bulk Upload (CSV)'}
                </button>
                <button onClick={() => setShowAddProduct(true)}
                  className="bg-[#0D47A1] hover:bg-[#1565C0] text-white px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus size={16} /> Add Product
                </button>
              </div>
            </div>

            {showAddProduct && (
              <div className="bg-white rounded-[10px] shadow-sm p-5 mb-5 border border-[#1565C0]/20 relative">
                <button onClick={() => setShowAddProduct(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
                <h3 className="text-lg font-bold text-[#0D47A1] mb-4">Add New Product</h3>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Product Name</label>
                    <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Category</label>
                    <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0] bg-white">
                      {[
                        'Fashion - Women Ethnic','Fashion - Women Western','Fashion - Men','Fashion - Kids',
                        'Jewellery & Accessories','Bags & Wallets','Watches',
                        'Beauty & Personal Care','Skincare','Haircare',
                        'Home & Kitchen','Home Decor','Storage & Organizers',
                        'Baby & Kids','Toys',
                        'Home Improvement','Utility Products',
                        'Electronics & Accessories','Mobile Accessories','Small Gadgets',
                        'Health & Wellness',
                        'Trending - Viral on Reels','Trending - Under ₹199',
                        'Combo & Value Packs','Refill & Repeat'
                      ].map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Selling Price (₹)</label>
                    <input required type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">MRP (₹)</label>
                    <input required type="number" value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: e.target.value})} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Stock Quantity</label>
                    <input required type="number" value={newProduct.stock_quantity} onChange={e => setNewProduct({...newProduct, stock_quantity: e.target.value})} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]" />
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <p className="text-[10px] text-gray-500 font-medium">This budget is split between Creators (90%) and BYNDIO (10%). Higher commission attracts more promoters!</p>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Product Images *</label>
                    <div className="flex flex-col gap-4">
                      {newProduct.images.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {newProduct.images.map((img, idx) => (
                            <div key={idx} className="relative w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-3xl border border-gray-200 overflow-hidden shrink-0 group">
                              {(img.startsWith('http') || img.startsWith('https')) ? <img src={img} className="w-full h-full object-cover" /> : img}
                              <button type="button" onClick={() => setNewProduct({...newProduct, images: newProduct.images.filter((_, i) => i !== idx)})} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex-1 w-full space-y-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Option 1: Upload Files</span>
                          <input 
                            type="file" accept="image/*" multiple
                            onChange={async (e) => {
                              const files = e.target.files;
                              if (!files || files.length === 0) return;
                              setImgUploading(true);
                              try {
                                const newUrls = [...newProduct.images];
                                for (let i = 0; i < files.length; i++) {
                                  const file = files[i];
                                  const compressed = await compressImage(file);
                                  const fileName = `${user?.id}/${Date.now()}-${file.name}`;
                                  const { data, error } = await supabase.storage.from('products').upload(fileName, compressed);
                                  if (error) throw error;
                                  const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
                                  newUrls.push(publicUrl);
                                }
                                setNewProduct({ ...newProduct, images: newUrls });
                                toastSuccess('Images uploaded and compressed!');
                              } catch (err: any) {
                                toast('Upload failed: ' + err.message, 'error');
                              } finally {
                                setImgUploading(false);
                              }
                            }}
                            className="text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer" 
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Option 2: Image URL</span>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              id="img-url-input"
                              placeholder="https://example.com/image.jpg"
                              className="w-full p-2 border border-gray-300 rounded-md text-[11px] outline-none focus:border-[#1565C0]"
                            />
                            <button type="button" onClick={() => {
                              const input = document.getElementById('img-url-input') as HTMLInputElement;
                              if (input && input.value) {
                                setNewProduct({...newProduct, images: [...newProduct.images, input.value]});
                                input.value = '';
                              }
                            }} className="bg-gray-100 px-3 rounded-md text-[11px] font-bold">Add</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Description</label>
                    <textarea required rows={3} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]"></textarea>
                  </div>
                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Promo Video URL (Optional)</label>
                    <input type="text" value={newProduct.promo_video_url} onChange={e => setNewProduct({...newProduct, promo_video_url: e.target.value})} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]" placeholder="https://youtube.com/shorts/... or S3 link" />
                    <p className="text-[10px] text-gray-400">Vertical format (9:16) recommended for best experience on reels feed.</p>
                  </div>
                  <div className="md:col-span-2 flex justify-end mt-2">
                    <button type="submit" disabled={isSubmitting} className="bg-[#E65100] hover:bg-[#F57C00] disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-bold text-sm transition-colors">
                      {isSubmitting ? 'Adding...' : 'Save Product'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white rounded-[10px] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] text-left">
                  <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                    <tr><th className="p-3 border-b border-gray-200 w-12"></th><th className="p-3 border-b border-gray-200">Product</th><th className="p-3 border-b border-gray-200">Price</th><th className="p-3 border-b border-gray-200">Comm.</th><th className="p-3 border-b border-gray-200">Stock</th><th className="p-3 border-b border-gray-200">Status</th><th className="p-3 border-b border-gray-200">Actions</th></tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={i} className="hover:bg-blue-50/50">
                        <td className="p-3 border-b border-gray-200">
                          <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                            {p.images?.[0] ? (
                              <img 
                                src={getOptimizedImageUrl(p.images[0], 100, 100)} 
                                className="w-full h-full object-cover" 
                                alt=""
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=📦'; }}
                              />
                            ) : (
                              <span className="text-xl">📦</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{p.name}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{p.category}</span>
                          </div>
                        </td>
                        <td className="p-3 border-b border-gray-200 font-bold text-gray-900">₹{p.price.toLocaleString('en-IN')}</td>
                        <td className="p-3 border-b border-gray-200 font-bold text-[#E65100]">{p.commission_pct || 10}%</td>
                        <td className="p-3 border-b border-gray-200 font-medium text-gray-600">{p.stock_quantity}</td>
                        <td className="p-3 border-b border-gray-200">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${getStatusColor(p.is_active ? 'Active' : (p.approval_status === 'pending' ? 'Pending' : 'Inactive'))}`}>
                            {p.is_active ? 'Active' : (p.approval_status === 'pending' ? 'Reviewing' : 'Hidden')}
                          </span>
                        </td>
                        <td className="p-3 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <Link to={`/product/${p.id}`} target="_blank" className="text-[11px] text-[#2E7D32] font-black hover:underline flex items-center gap-1 uppercase tracking-wider">
                              <Eye size={12} /> View
                            </Link>
                            <button onClick={() => {
                              setEditingProduct({ ...p, images: p.images || [], price: String(p.price), mrp: String(p.mrp), stock_quantity: String(p.stock_quantity) });
                              setShowEditProduct(true);
                            }} className="text-[11px] text-[#1565C0] font-black hover:underline uppercase tracking-wider">Edit</button>
                            <button onClick={async () => {
                              if (!window.confirm('Delete this product permanently? This cannot be undone.')) return;
                              const { error: delErr } = await supabase.from('products').delete().eq('id', p.id).eq('seller_id', user.id);
                              if (delErr) { 
                                toast('Delete failed: ' + delErr.message, 'error'); 
                              } else { 
                                toastSuccess('Product deleted successfully.'); 
                                fetchDashboardData(); 
                              }
                            }} className="text-[11px] text-red-600 font-black hover:underline uppercase tracking-wider">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr><td colSpan={6} className="p-4 text-center text-gray-500">No products found. Add your first product!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      case 'earnings':
        return (
          <>
            <div className="text-xl font-black text-[#0D47A1] mb-4">💰 Earnings & Wallet</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 mb-5">
              <div className="bg-gradient-to-br from-[#0D47A1] to-[#1565C0] text-white rounded-[10px] p-4.5 shadow-sm flex items-center gap-3.5 col-span-1 sm:col-span-2">
                <div className="w-12 h-12 rounded-[10px] bg-white/20 flex items-center justify-center text-[28px] shrink-0">💰</div>
                <div><div className="text-[22px] font-black">₹{orders.reduce((sum, o) => sum + (o.price * o.quantity), 0).toLocaleString('en-IN')}</div><div className="text-xs text-white/80">Total Revenue</div></div>
              </div>
              <div className="bg-white rounded-[10px] p-4.5 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[10px] bg-[#FFF3E0] flex items-center justify-center text-[28px] shrink-0">⏳</div>
                <div><div className="text-[18px] font-black text-[#E65100]">₹{pendingBalance.toLocaleString('en-IN')}</div><div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Pending Approval</div></div>
              </div>
              <div className="bg-white rounded-[10px] p-4.5 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-[10px] bg-[#E8F5E9] flex items-center justify-center text-[28px] shrink-0">✅</div>
                <div><div className="text-[18px] font-black text-[#2E7D32]">₹{walletBalance.toLocaleString('en-IN')}</div><div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Available Balance</div></div>
              </div>
            </div>
            <div className="bg-white rounded-[10px] p-5 shadow-sm mb-4">
              <div className="text-[14px] font-black mb-3">Payout Options</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="font-bold text-[13px] mb-1">Standard Payout (Free)</div>
                  <div className="text-[11px] text-gray-500 mb-1">7-day settlement to bank account. No fee.</div>
                  <div className="text-[12px] font-semibold text-[#0D47A1] mb-3">
                    Available: ₹{walletBalance.toLocaleString('en-IN')}
                  </div>
                  <button onClick={handleWithdraw} disabled={isWithdrawing || walletBalance <= 0}
                    className="bg-[#388E3C] hover:bg-[#2E7D32] disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-[12px] font-bold transition-colors">
                    {isWithdrawing ? 'Submitting...' : '💸 Withdraw Funds'}
                  </button>
                </div>
                <div className="border-2 border-[#0D47A1] rounded-lg p-4 relative">
                  <div className="absolute -top-3 left-3 bg-[#0D47A1] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">PRO</div>
                  <div className="font-bold text-[13px] mb-1">Instant Payout (1–2% fee)</div>
                  <div className="text-[11px] text-gray-500 mb-3">Get funds in 24–48 hours. Available with Seller Pro.</div>
                  <button onClick={() => toast('Upgrade to Seller Pro for instant payouts!', 'info')} className="bg-white text-[#0D47A1] border-2 border-[#0D47A1] px-4 py-2 rounded-md text-[12px] font-bold hover:bg-[#E3F2FD] transition-colors">Upgrade to Pro</button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-[10px] p-5 shadow-sm">
              <div className="text-[14px] font-black mb-3">Seller Subscription Plans</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: 'Free', price: '₹0/mo', features: ['Unlimited listings', '0% commission', 'Basic analytics', '7-day payout'], color: 'border-gray-200' },
                  { name: 'Pro', price: '₹1,999/mo', features: ['Everything in Free', 'Bulk CSV upload', 'Advanced analytics', 'COD protection', 'Priority support', 'Instant payout'], color: 'border-[#0D47A1]', popular: true },
                  { name: 'Premium', price: '₹4,999/mo', features: ['Everything in Pro', 'Dedicated manager', 'API access', 'Custom integrations', 'White-label options'], color: 'border-gray-200' },
                ].map((plan, i) => (
                  <div key={i} className={`border-2 ${plan.color} rounded-xl p-4 relative`}>
                    {(plan as any).popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF9800] text-white text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">★ Most Popular</div>}
                    <div className="font-black text-[15px] mb-0.5">{plan.name}</div>
                    <div className="text-[22px] font-black text-[#0D47A1] mb-3">{plan.price}</div>
                    {plan.features.map(f => <div key={f} className="text-[12px] text-gray-600 flex items-center gap-1.5 mb-1"><span className="text-[#388E3C] font-black">✓</span>{f}</div>)}
                    <button
                      disabled={plan.name === 'Free' || user?.subscription_plan === plan.name.toLowerCase()}
                      onClick={() => navigate('/pricing?role=seller')}
                      className="w-full mt-3 bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 rounded-md text-[12px] font-bold transition-colors">
                      {user?.subscription_plan === plan.name.toLowerCase() ? '✓ Current Plan' : plan.name === 'Free' ? 'Free Plan' : `Get ${plan.name}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      case 'affiliate':
        return (
          <>
            <div className="text-xl font-black text-[#0D47A1] mb-4">🔗 Affiliate Links</div>
            <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-xl p-4 mb-4">
              <div className="font-black text-[14px] text-[#0D47A1] mb-1">Generate Affiliate Links for Your Products</div>
              <p className="text-[12px] text-gray-600">Share product links and earn 8% commission on every sale through your link. Works the same as influencer links!</p>
            </div>
            <div className="bg-white rounded-[10px] p-5 shadow-sm mb-4">
              <div className="text-[14px] font-bold mb-3">Your Products — Generate Links</div>
              {products.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">Add products first to generate affiliate links.</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {products.map(p => {
                    const code = `seller-${user?.id?.slice(0,8)}-${p.id?.toString().slice(0,8)}`;
                    const url = `${window.location.origin}/products?ref=${code}`;
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                        <span className="text-2xl">{p.images?.[0] || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold truncate">{p.name}</div>
                          <code className="text-[10px] text-gray-500 truncate block">{url}</code>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(url).catch(()=>{}); toastSuccess('Affiliate link copied to clipboard!') }}
                          className="text-[11px] font-bold text-[#0D47A1] hover:underline whitespace-nowrap">Copy Link</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        );
      case 'influencers':
        return (
          <>
            <div className="text-xl font-black text-[#0D47A1] mb-4">⭐ Creator Partnerships</div>
            <div className="bg-white rounded-[10px] p-5 shadow-sm">
              <p className="text-[13px] text-gray-500 mb-4">Connect with verified creators to boost your product visibility and sales</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {[
                  { name: '@StyleByRiya', cat: 'Fashion', followers: '2.4M', rate: '₹8,000/post' },
                  { name: '@GlowWithNisha', cat: 'Beauty', followers: '3.1M', rate: '₹10,000/post' },
                  { name: '@FitIndia', cat: 'Sports', followers: '1.2M', rate: '₹5,000/post' }
                ].map((c, i) => (
                  <div key={i} className="border border-gray-200 rounded-[10px] p-4 text-center">
                    <span className="text-4xl block mb-2">⭐</span>
                    <div className="text-xs font-extrabold mb-0.5">{c.name}</div>
                    <div className="text-[10px] text-[#7B1FA2] font-semibold">{c.cat}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{c.followers} followers</div>
                    <div className="text-[11px] font-bold text-[#1565C0] mt-1">{c.rate}</div>
                    <button onClick={() => toastSuccess(`Partnership request sent to ${c.name}!`)} className="w-full mt-2 bg-[#0D47A1] hover:bg-[#1565C0] text-white py-1.5 rounded text-[11px] font-bold transition-colors">
                      Request Partnership
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        );
      case 'analytics':
        return (
          <>
            <div className="text-xl font-black text-[#0D47A1] mb-4">📈 Analytics Insights</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-5">
              {[
                { label: 'Products Listed', value: products.length, icon: '🏷️', sub: 'active' },
                { label: 'Avg. Order Value', value: orders.length > 0 ? `₹${Math.round(orders.reduce((s, o) => s + (o.price || 0) * (o.quantity || 0), 0) / orders.length).toLocaleString('en-IN')}` : '₹0', icon: '📊', sub: 'per order' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-[10px] p-4 shadow-sm">
                  <div className="text-[22px] mb-1">{s.icon}</div>
                  <div className="text-[20px] font-black">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                  <div className="text-[10px] text-[#388E3C] font-semibold mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-[10px] p-5 shadow-sm mb-4">
              <div className="text-[14px] font-black mb-3">Top Products by Revenue</div>
              {products.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No products yet. Add products to see analytics.</div>
              ) : (() => {
                // Compute real revenue per product from actual order data
                const withRev = products.slice(0, 5).map(p => ({
                  ...p,
                  rev: orders.filter(o => o.products?.name === p.name).reduce((s: number, o: any) => s + o.price * o.quantity, 0),
                }));
                const maxRev = Math.max(...withRev.map(p => p.rev), 1);
                return (
                  <div className="flex flex-col gap-2">
                    {withRev.map((p, i) => {
                      // Bar width based on real revenue proportion; min 4% so bar is always visible
                      const pct = p.rev > 0 ? Math.max(4, Math.round((p.rev / maxRev) * 100)) : 4;
                      return (
                        <div key={p.id} className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-400 w-5">{i + 1}</span>
                          <span className="text-xl shrink-0">{p.images?.[0] || '📦'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-semibold truncate">{p.name}</div>
                            <div className="h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                              <div className="h-full bg-[#0D47A1] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <div className="text-[12px] font-black text-[#388E3C] shrink-0">
                            {p.rev > 0 ? `₹${p.rev.toLocaleString('en-IN')}` : 'No sales yet'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-lg p-4 text-center">
              <div className="font-bold text-[#0D47A1] text-[13px] mb-1">Advanced Analytics Available with Seller Pro</div>
              <div className="text-[11px] text-gray-600">Detailed charts, conversion funnels, customer demographics, and export reports.</div>
            </div>
          </>
        );

      case 'leaderboard':
        return (
          <>
            <div className="text-xl font-black text-[#0D47A1] mb-4">🏆 Leaderboard</div>
            <div className="bg-[#E3F2FD] border border-[#90CAF9] rounded-xl p-4 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-black text-[14px] text-[#0D47A1]">See how you rank among all BYNDIO sellers & creators</div>
                <div className="text-[12px] text-gray-600 mt-0.5">Rankings update every 24 hours based on total affiliate earnings.</div>
              </div>
              <Link to="/leaderboard" target="_blank"
                className="bg-[#0D47A1] text-white px-4 py-2 rounded-md text-[12px] font-bold hover:bg-[#1565C0] transition-colors">
                View Full Leaderboard →
              </Link>
            </div>
            <div className="bg-white rounded-[10px] p-5 shadow-sm">
              <div className="text-[13px] font-bold mb-3 text-gray-600">Your Stats</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Affiliate Earnings', val: '₹0', icon: '💰' },
                  { label: 'Total Clicks', val: '0', icon: '👆' },
                  { label: 'Conversions', val: '0', icon: '🛒' },
                  { label: 'Your Rank', val: '—', icon: '🏆' },
                ].map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-[20px] mb-1">{s.icon}</div>
                    <div className="text-[16px] font-black">{s.val}</div>
                    <div className="text-[10px] text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-3 text-center">Generate affiliate links and promote your products to start climbing the leaderboard!</p>
            </div>
          </>
        );

      case 'settings':
        return (
          <>
            <div className="text-xl font-black text-[#0D47A1] mb-4">⚙️ Account Settings</div>
            {kycStatus !== 'approved' && (
              <div className="bg-[#FFF3E0] border border-[#FFE0B2] text-[#E65100] px-6 py-5 rounded-[14px] mb-6 shadow-sm flex items-center justify-between">
                 <div>
                   <div className="font-black text-[15px] mb-1">Action Required: Complete KYC</div>
                   <div className="text-[13px] font-medium opacity-90">To fully activate your seller account and enable payouts, complete the KYC verification.</div>
                 </div>
                 <button onClick={() => setTab('kyc')} className="bg-[#E65100] text-white px-6 py-2.5 rounded-lg font-black text-sm hover:bg-[#EF6C00] transition-colors shadow-md flex items-center gap-2">Complete KYC <ChevronRight size={16} /></button>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white rounded-[10px] p-5 shadow-sm">
                <div className="text-[14px] font-bold mb-4 border-b border-gray-100 pb-2 flex items-center justify-between">
                  Subscription Plan
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${storeInfo.subscription_plan === 'pro' ? 'bg-blue-100 text-blue-700' : storeInfo.subscription_plan === 'enterprise' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                    {storeInfo.subscription_plan}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50">
                    <div className="text-[12px] font-bold text-gray-900 mb-1">Current Plan: {storeInfo.subscription_plan.toUpperCase()}</div>
                    <div className="text-[10px] text-gray-500 mb-2">
                      {storeInfo.subscription_plan === 'free' ? 'Upgrade to unlock more products, analytics & boost tools.' : 'You have access to premium seller features.'}
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/pricing?role=seller')}
                    className="w-full bg-[#0D47A1] hover:bg-[#1565C0] text-white py-3 rounded-xl text-sm font-black transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    🚀 Upgrade Your Plan <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-[10px] p-5 shadow-sm">
                <div className="text-[14px] font-bold mb-4 border-b border-gray-100 pb-2">Store Information</div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Store Name', field: 'store_name', placeholder: `${user?.name}'s Store`, type: 'text' },
                    { label: 'Business Email', field: 'business_email', placeholder: user?.email || 'store@example.com', type: 'email' },
                    { label: 'Support Phone', field: 'support_phone', placeholder: '+91 98765 43210', type: 'tel' },
                    { label: 'Store Location', field: 'store_location', placeholder: 'Mumbai, Maharashtra', type: 'text' },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} value={(storeInfo as any)[f.field]} onChange={e => setStoreInfo({ ...storeInfo, [f.field]: e.target.value })}
                        className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0] font-medium" />
                    </div>
                  ))}
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Business State (Required for Compliance)</label>
                    <select 
                      value={kycData.state} 
                      onChange={e => setKycData({ ...kycData, state: e.target.value })}
                      className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0] font-medium bg-white"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={handleSaveStore} disabled={isSavingStore}
                    className="bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 text-white py-2.5 rounded-md text-[13px] font-bold transition-colors mt-1">
                    {isSavingStore ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-[10px] p-5 shadow-sm">
                <div className="text-[14px] font-bold mb-4 border-b border-gray-100 pb-2">Bank Account for Payouts</div>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Account Holder Name', field: 'account_holder', placeholder: 'As per bank records', type: 'text' },
                    { label: 'Account Number', field: 'account_number', placeholder: '••••••••1234', type: 'text' },
                    { label: 'IFSC Code', field: 'ifsc', placeholder: 'HDFC0001234', type: 'text' },
                    { label: 'Bank Name', field: 'bank_name', placeholder: 'HDFC Bank', type: 'text' },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} value={(bankDetails as any)[f.field]} onChange={e => setBankDetails({ ...bankDetails, [f.field]: e.target.value })}
                        className="p-2.5 border border-gray-300 rounded-md text-[13px] outline-none focus:border-[#1565C0] font-medium" />
                    </div>
                  ))}
                  <button onClick={handleSaveBank} disabled={isSavingBank}
                    className="bg-[#388E3C] hover:bg-[#2E7D32] disabled:bg-gray-400 text-white py-2.5 rounded-md text-[13px] font-bold transition-colors mt-1">
                    {isSavingBank ? 'Saving...' : '💰 Save Bank Details'}
                  </button>
                </div>
              </div>

              {/* Removed KYC & Compliance box to streamline UX. Keep Notification Preferences. */}
              <div className="bg-white rounded-[10px] p-5 shadow-sm lg:col-span-2">
                <div className="text-[14px] font-bold mb-4 border-b border-gray-100 pb-2">Notification Preferences</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'New order received', defaultChecked: true },
                    { label: 'Order status updates', defaultChecked: true },
                    { label: 'Weekly earnings report', defaultChecked: true },
                    { label: 'Platform announcements', defaultChecked: false },
                    { label: 'Flash sale invitations', defaultChecked: true },
                  ].map(pref => (
                    <label key={pref.label} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                      <span className="text-[13px] font-semibold">{pref.label}</span>
                      <input type="checkbox" defaultChecked={pref.defaultChecked} className="accent-[#0D47A1] w-4 h-4 cursor-pointer" />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
      case 'ads':
        return (
          <>
            <div className="text-xl font-black text-[#0D47A1] mb-4 flex items-center gap-2"><Megaphone className="w-6 h-6" /> Ads & Product Boost</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              {[
                { type: 'feed_boost', icon: '📱', label: 'Feed Boost', desc: 'Priority in reels & feed', color: '#E040FB' },
                { type: 'product_boost', icon: '🔝', label: 'Top Placement', desc: 'Top of category listings', color: '#0D47A1' },
                { type: 'search_ad', icon: '🔍', label: 'Search Ads', desc: 'Sponsored in search results', color: '#E65100' },
                { type: 'category_boost', icon: '📂', label: 'Category Banner', desc: 'Highlighted in category page', color: '#2E7D32' },
              ].map(b => (
                <div key={b.type} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="text-2xl mb-2">{b.icon}</div>
                  <div className="text-[13px] font-black mb-0.5" style={{color: b.color}}>{b.label}</div>
                  <div className="text-[10px] text-gray-500 mb-3">{b.desc}</div>
                  {products.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <select className={`boost-select-${b.type} p-1.5 border border-gray-200 rounded-lg text-[11px] outline-none`}>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {[{dur: '24h', price: b.type === 'feed_boost' ? 99 : b.type === 'product_boost' ? 149 : b.type === 'search_ad' ? 199 : 299},
                        {dur: '7 days', price: b.type === 'feed_boost' ? 499 : b.type === 'product_boost' ? 799 : b.type === 'search_ad' ? 999 : 1499},
                      ].map(opt => (
                        <button key={opt.dur} onClick={async () => {
                          const sel = (document.querySelector(`.boost-select-${b.type}`) as HTMLSelectElement)?.value;
                          if (!sel) return;
                          try {
                            const session = await supabase.auth.getSession();
                            const res = await fetch('/api/purchase-boost', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.data.session?.access_token}` },
                              body: JSON.stringify({ productId: sel, boostPackageId: null, paymentId: 'DEMO-' + Date.now() })
                            });
                            const data = await res.json();
                            if (res.ok) toastSuccess(`${b.label} activated! ${data.boost?.usedFreeBoost ? '(Free boost used)' : ''}`);
                            else toast(data.error || 'Boost failed', 'error');
                          } catch {
                            // Fallback: direct DB update for local dev
                            const until = new Date(Date.now() + (opt.dur === '24h' ? 24 : 168) * 3600000).toISOString();
                            await supabase.from('products').update({ is_sponsored: true, sponsored_until: until }).eq('id', sel).eq('seller_id', user!.id);
                            toastSuccess(`${b.label} activated for ${opt.dur}!`);
                          }
                        }} className="w-full text-white py-1.5 rounded-lg text-[10px] font-black transition-all hover:opacity-90" style={{backgroundColor: b.color}}>
                          {opt.dur} — ₹{opt.price}
                        </button>
                      ))}
                    </div>
                  ) : <p className="text-[10px] text-gray-400">Add products first</p>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="text-[13px] font-black text-gray-900 mb-3 flex items-center gap-2"><ShieldCheck size={16} className="text-[#2E7D32]" /> Premium Seller Badge</div>
                <div className="text-[11px] text-gray-500 mb-3">Increase trust & conversion with a verified badge on your products.</div>
                {[{type: 'verified', price: 299, label: '✅ Verified Seller'}, {type: 'trusted', price: 599, label: '⭐ Trusted Seller'}, {type: 'premium', price: 999, label: '💎 Premium Seller'}].map(badge => (
                  <button key={badge.type} onClick={async () => {
                    try {
                      const session = await supabase.auth.getSession();
                      const res = await fetch('/api/purchase-badge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.data.session?.access_token}` },
                        body: JSON.stringify({ badgeType: badge.type, paymentId: 'DEMO-' + Date.now() })
                      });
                      const data = await res.json();
                      if (res.ok) toastSuccess(`${badge.label} badge activated!`);
                      else toast(data.error || 'Badge purchase failed', 'error');
                    } catch { toast('Badge service unavailable', 'error'); }
                  }} className="w-full flex items-center justify-between p-2.5 border border-gray-100 rounded-lg mb-2 hover:bg-gray-50 transition-all text-left">
                    <span className="text-[11px] font-bold">{badge.label}</span>
                    <span className="text-[10px] font-black text-[#0D47A1]">₹{badge.price}/mo</span>
                  </button>
                ))}
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <div className="text-[13px] font-black text-gray-900 mb-3 flex items-center gap-2"><Eye size={16} className="text-[#E65100]" /> Featured Store</div>
                <div className="text-[11px] text-gray-500 mb-3">Highlight your store on BYNDIO homepage for maximum visibility.</div>
                {[{dur: 7, price: 999}, {dur: 30, price: 2999}, {dur: 90, price: 7499}].map(opt => (
                  <button key={opt.dur} onClick={async () => {
                    try {
                      const session = await supabase.auth.getSession();
                      const res = await fetch('/api/purchase-featured-store', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.data.session?.access_token}` },
                        body: JSON.stringify({ duration: opt.dur, title: storeInfo.store_name, paymentId: 'DEMO-' + Date.now() })
                      });
                      const data = await res.json();
                      if (res.ok) toastSuccess(`Store featured for ${opt.dur} days!`);
                      else toast(data.error || 'Failed', 'error');
                    } catch { toast('Service unavailable', 'error'); }
                  }} className="w-full flex items-center justify-between p-2.5 border border-gray-100 rounded-lg mb-2 hover:bg-gray-50 transition-all text-left">
                    <span className="text-[11px] font-bold">📍 {opt.dur} Days</span>
                    <span className="text-[10px] font-black text-[#E65100]">₹{opt.price.toLocaleString('en-IN')}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 bg-[#E3F2FD] border border-[#90CAF9] rounded-xl p-4 text-[11px] text-[#0D47A1] font-bold">
              💡 Pro & Brand plan subscribers get free monthly boosts included. <button onClick={() => setTab('settings')} className="underline ml-1">Upgrade Plan →</button>
            </div>
          </>
        );
      default:
        return (
          <>
            <div className="text-xl font-black text-[#0D47A1] mb-4">⚙️ {tab.charAt(0).toUpperCase() + tab.slice(1)}</div>
            <div className="bg-white rounded-[10px] p-5 shadow-sm text-gray-500">
              This section is under development. Coming soon!
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-115px)] bg-[#F5F5F5]">
      {/* Sidebar */}
      <div className="w-full md:w-[220px] bg-[#1A1A2E] text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <div className="bg-[#F57C00] w-8 h-8 rounded-t-md rounded-b-xl flex items-center justify-center text-white shrink-0">
            <ShoppingBag size={18} />
          </div>
          <div>
            <div className="text-lg font-black leading-none">BYNDIO</div>
            <div className="text-[10px] opacity-50 uppercase tracking-widest mt-0.5">Seller Center</div>
          </div>
        </div>
        <div className="py-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.locked && kycStatus !== 'approved') {
                    toast('KYC Verification Required: Please complete your verification to access this section.', 'error');
                    setTab('kyc');
                  } else {
                    setTab(item.id);
                  }
                }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors border-l-[3px] relative ${tab === item.id ? 'bg-white/10 text-white border-[#FF9800]' : 'text-white/70 border-transparent hover:bg-white/5 hover:text-white'}`}
              >
                <Icon size={16} /> 
                <span>{item.label}</span>
                {item.locked && kycStatus !== 'approved' && (
                  <div className="ml-auto">
                    <Shield size={12} className="text-orange-500 opacity-70" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="p-4 border-t border-white/10">
          <div className="bg-white/5 rounded-lg p-3 text-center border border-white/5">
            <div className="text-[10px] opacity-50 uppercase mb-1 tracking-widest font-bold">Current Status</div>
            <div className={`text-[13px] font-black tracking-tighter uppercase ${
              (storeInfo as any).subscription_plan === 'pro' ? 'text-[#FF9800]' : 
              (storeInfo as any).subscription_plan === 'premium' ? 'text-[#E040FB]' : 'text-blue-400'
            }`}>
              {(storeInfo as any).subscription_plan || 'Starter'} Plan
            </div>
            <button 
              onClick={() => window.location.href = '/seller#plans'} 
              className="mt-2 text-[10px] bg-white/10 hover:bg-white/20 text-white/80 py-1.5 px-4 rounded-full font-bold transition-all"
            >
              UPGRADE
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        {renderContent()}
      </div>

      {showBulkUpload && (
        <BulkUpload
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => { fetchDashboardData(); setShowBulkUpload(false); }}
        />
      )}

      {/* FIX #5: Edit Product Modal */}
      {showEditProduct && editingProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl relative">
            <button onClick={() => { setShowEditProduct(false); setEditingProduct(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-[#0D47A1] mb-4">Edit Product</h3>
            <form onSubmit={handleEditProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Product Name</label>
                <input required type="text" value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Category</label>
                <select value={editingProduct.category} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0] bg-white">
                  {[
                    'Fashion - Women Ethnic','Fashion - Women Western','Fashion - Men','Fashion - Kids',
                    'Jewellery & Accessories','Bags & Wallets','Watches',
                    'Beauty & Personal Care','Skincare','Haircare',
                    'Home & Kitchen','Home Decor','Storage & Organizers',
                    'Baby & Kids','Toys',
                    'Home Improvement','Utility Products',
                    'Electronics & Accessories','Mobile Accessories','Small Gadgets',
                    'Health & Wellness',
                    'Trending - Viral on Reels','Trending - Under ₹199',
                    'Combo & Value Packs','Refill & Repeat'
                  ].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Selling Price (₹)</label>
                <input required type="number" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase">MRP (₹)</label>
                <input required type="number" value={editingProduct.mrp} onChange={e => setEditingProduct({ ...editingProduct, mrp: e.target.value })} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Stock Quantity</label>
                <input required type="number" value={editingProduct.stock_quantity} onChange={e => setEditingProduct({ ...editingProduct, stock_quantity: e.target.value })} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]" />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Product Images *</label>
                <div className="flex flex-col gap-4">
                  {editingProduct.images?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {editingProduct.images.map((img: string, idx: number) => (
                        <div key={idx} className="relative w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-3xl border border-gray-200 overflow-hidden shrink-0 group">
                          {(img.startsWith('http') || img.startsWith('https')) ? <img src={img} className="w-full h-full object-cover" /> : img}
                          <button type="button" onClick={() => setEditingProduct({...editingProduct, images: editingProduct.images.filter((_: any, i: number) => i !== idx)})} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Option 1: Upload Files</span>
                      <input 
                        type="file" accept="image/*" multiple
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files || files.length === 0) return;
                          setImgUploading(true);
                          try {
                            const newUrls = [...(editingProduct.images || [])];
                            for (let i = 0; i < files.length; i++) {
                              const file = files[i];
                              const compressed = await compressImage(file);
                              const fileName = `${user?.id}/${Date.now()}-${file.name}`;
                              const { data, error } = await supabase.storage.from('products').upload(fileName, compressed);
                              if (error) throw error;
                              const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(fileName);
                              newUrls.push(publicUrl);
                            }
                            setEditingProduct({ ...editingProduct, images: newUrls });
                            toastSuccess('Images updated and compressed!');
                          } catch (err: any) {
                            toast('Upload failed: ' + err.message, 'error');
                          } finally {
                            setImgUploading(false);
                          }
                        }}
                        className="text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-[#0D47A1] hover:file:bg-blue-100 cursor-pointer" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Option 2: Image URL</span>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          id="edit-img-url-input"
                          placeholder="https://example.com/image.jpg"
                          className="w-full p-2 border border-gray-300 rounded-md text-[11px] outline-none focus:border-[#1565C0]"
                        />
                        <button type="button" onClick={() => {
                          const input = document.getElementById('edit-img-url-input') as HTMLInputElement;
                          if (input && input.value) {
                            setEditingProduct({...editingProduct, images: [...(editingProduct.images || []), input.value]});
                            input.value = '';
                          }
                        }} className="bg-gray-100 px-3 rounded-md text-[11px] font-bold">Add</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-black text-[#0D47A1] uppercase flex items-center justify-between">
                  <span>Promotion Commission ({editingProduct.commission_pct || 10}%)</span>
                  <span className="text-gray-400">Range: 5% - 20%</span>
                </label>
                <input 
                  type="range" min="5" max="20" step="1"
                  value={editingProduct.commission_pct || 10} 
                  onChange={e => setEditingProduct({...editingProduct, commission_pct: e.target.value})} 
                  className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-[#0D47A1]" 
                />
              </div>
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-bold text-gray-500 uppercase">Description</label>
                <textarea required rows={3} value={editingProduct.description || ''} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} className="p-2 border border-gray-300 rounded-md text-sm outline-none focus:border-[#1565C0]"></textarea>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => { setShowEditProduct(false); setEditingProduct(null); }} className="border border-gray-300 text-gray-600 px-5 py-2 rounded-md font-bold text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-bold text-sm transition-colors">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <InputModal
        isOpen={showAwbModal}
        onClose={() => setShowAwbModal(false)}
        onSubmit={handleAwbSubmit}
        title="Enter AWB / Tracking Number"
        placeholder="e.g., SR123456789"
        submitLabel="Save & Mark Shipped"
      />
    </div>
  );
}
