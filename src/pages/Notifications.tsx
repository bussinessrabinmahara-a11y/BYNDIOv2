import { useState, useEffect, useRef } from 'react';
import { usePageTitle } from '../lib/usePageTitle';
import { Bell, Package, Tag, Star, DollarSign, AlertCircle, CheckCircle, Trash2, RefreshCw, BellOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'order' | 'flash_sale' | 'review' | 'payment' | 'system' | 'kyc' | 'referral';
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  order:      { icon: Package,     color: 'text-[#1565C0]', bg: 'bg-[#E3F2FD]' },
  flash_sale: { icon: Tag,         color: 'text-[#E65100]', bg: 'bg-[#FFF3E0]' },
  review:     { icon: Star,        color: 'text-[#F9A825]', bg: 'bg-[#FFFDE7]' },
  payment:    { icon: DollarSign,  color: 'text-[#2E7D32]', bg: 'bg-[#E8F5E9]' },
  system:     { icon: AlertCircle, color: 'text-gray-600',  bg: 'bg-gray-100'  },
  kyc:        { icon: CheckCircle, color: 'text-[#6A1B9A]', bg: 'bg-[#F3E5F5]' },
  referral:   { icon: Star,        color: 'text-[#AD1457]', bg: 'bg-[#FCE4EC]' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Notifications() {
  usePageTitle('Notifications');
  const { user } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter]   = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<'default' | 'granted' | 'denied'>(
    typeof Notification !== 'undefined' ? Notification.permission as any : 'default'
  );
  const realtimeRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    subscribeRealtime();
    return () => { if (realtimeRef.current) supabase.removeChannel(realtimeRef.current); };
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setNotifications(data as Notification[]);
    } catch (e) { /* non-critical — table may not exist yet */ }
    setLoading(false);
  };

  const subscribeRealtime = () => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        const notif = payload.new as Notification;
        setNotifications(prev => [notif, ...prev]);
        // Show browser push notification if permission granted
        if (pushStatus === 'granted' && typeof Notification !== 'undefined') {
          new Notification(`BYNDIO: ${notif.title}`, {
            body: notif.message,
            icon: '/icon-192.png',
          });
        }
      })
      .subscribe();
    realtimeRef.current = channel;
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  };

  const requestPushPermission = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPushStatus(result as any);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const displayed   = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;

  if (!user) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <Bell size={48} className="text-gray-300 mb-4"/>
      <h2 className="text-xl font-black mb-2">Login to view notifications</h2>
      <Link to="/" className="bg-[#0D47A1] text-white px-6 py-2.5 rounded-md font-bold mt-4">Go Home</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5] py-5 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E3F2FD] rounded-xl flex items-center justify-center relative">
              <Bell size={20} className="text-[#1565C0]"/>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <div className="text-[18px] font-black">Notifications</div>
              {unreadCount > 0 && <div className="text-[12px] text-[#E65100] font-semibold">{unreadCount} unread</div>}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[12px] text-[#1565C0] font-semibold hover:underline">
                Mark all read
              </button>
            )}
            <button onClick={fetchNotifications} title="Refresh"
              className={`p-2 text-gray-400 hover:text-gray-600 ${loading ? 'animate-spin' : ''}`}>
              <RefreshCw size={15}/>
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-[12px] font-bold transition-colors ${
                filter === f ? 'bg-[#0D47A1] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex flex-col gap-2.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                <div className="flex gap-3 items-start">
                  <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0"/>
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"/>
                    <div className="h-2.5 bg-gray-100 rounded w-full mb-1"/>
                    <div className="h-2.5 bg-gray-100 rounded w-2/3"/>
                  </div>
                </div>
              </div>
            ))
          ) : displayed.length === 0 ? (
            <div className="bg-white rounded-xl p-10 text-center shadow-sm">
              <BellOff size={40} className="mx-auto text-gray-200 mb-3"/>
              <div className="text-gray-400 text-[13px] font-semibold">
                {filter === 'unread' ? 'All caught up! No unread notifications.' : 'No notifications yet.'}
              </div>
            </div>
          ) : displayed.map(notif => {
            const cfg  = typeConfig[notif.type] || typeConfig.system;
            const Icon = cfg.icon;
            const content = (
              <div onClick={() => markRead(notif.id)}
                className={`bg-white rounded-xl p-4 shadow-sm flex gap-3 cursor-pointer hover:shadow-md transition-all ${
                  !notif.is_read ? 'border-l-4 border-[#0D47A1]' : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon size={18} className={cfg.color}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`text-[13px] font-bold ${!notif.is_read ? 'text-[#0D47A1]' : 'text-gray-800'}`}>{notif.title}</div>
                    <div className="text-[10px] text-gray-400 shrink-0">{timeAgo(notif.created_at)}</div>
                  </div>
                  <div className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">{notif.message}</div>
                  {!notif.is_read && <div className="w-2 h-2 bg-[#0D47A1] rounded-full mt-1.5"/>}
                </div>
                <button onClick={e => deleteNotif(notif.id, e)}
                  className="p-1.5 text-gray-300 hover:text-red-400 shrink-0 self-start">
                  <Trash2 size={13}/>
                </button>
              </div>
            );

            return notif.action_url ? (
              <Link key={notif.id} to={notif.action_url}>{content}</Link>
            ) : (
              <div key={notif.id}>{content}</div>
            );
          })}
        </div>

        {/* Push Notification Banner */}
        <div className="mt-5 bg-gradient-to-r from-[#0D47A1] to-[#1565C0] rounded-xl p-4 text-white">
          <div className="flex items-center gap-3">
            <Bell size={20} className="shrink-0"/>
            <div className="flex-1">
              <div className="text-[13px] font-black">
                {pushStatus === 'granted' ? '✅ Push Notifications Enabled' : 'Enable Push Notifications'}
              </div>
              <div className="text-[11px] text-white/75">
                {pushStatus === 'granted'
                  ? 'You\'ll get browser alerts for new orders, flash sales & earnings.'
                  : 'Get instant browser alerts for orders, flash sales & earnings.'}
              </div>
            </div>
            {pushStatus !== 'granted' && pushStatus !== 'denied' && (
              <button onClick={requestPushPermission}
                className="bg-white text-[#0D47A1] text-[11px] font-black px-3 py-1.5 rounded-full shrink-0 hover:bg-blue-50 transition-colors">
                Enable
              </button>
            )}
            {pushStatus === 'denied' && (
              <span className="text-[10px] text-white/60 shrink-0">Blocked in browser settings</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
