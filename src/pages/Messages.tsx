import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { Send, Search, MessageSquare, User as UserIcon, Circle } from 'lucide-react';

interface ChatUser {
  id: string;
  full_name: string;
  role: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function Messages() {
  const { user } = useAppStore();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchUsers();

    const channel = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          const msg = payload.new as Message;
          const isRelevant =
            (msg.sender_id === user.id && msg.receiver_id === selectedUser?.id) ||
            (msg.sender_id === selectedUser?.id && msg.receiver_id === user.id);
          if (isRelevant) {
            setMessages(prev => [...prev, msg]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedUser?.id]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
      inputRef.current?.focus();
    }
  }, [selectedUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(chatUsers);
    } else {
      setFilteredUsers(chatUsers.filter(u =>
        u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    }
  }, [searchQuery, chatUsers]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, role')
      .neq('id', user?.id)
      .order('full_name');
    if (data) {
      setChatUsers(data);
      setFilteredUsers(data);
    }
  };

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),` +
        `and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !selectedUser || !user || isSending) return;

    setIsSending(true);
    setNewMessage('');

    // Optimistic UI update
    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: selectedUser.id,
      content: text,
    });

    if (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setNewMessage(text);
    }
    setIsSending(false);
  };

  const getRoleColor = (role: string) => {
    if (role === 'seller') return 'text-[#E65100]';
    if (role === 'influencer') return 'text-[#7B1FA2]';
    if (role === 'admin') return 'text-[#0D47A1]';
    return 'text-gray-500';
  };

  const getRoleBadge = (role: string) => {
    if (role === 'seller') return '🏪';
    if (role === 'influencer') return '⭐';
    if (role === 'admin') return '🔒';
    return '🛒';
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
      ? d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-[#F5F5F5] h-[calc(100vh-106px)] flex flex-col">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <span className="text-[#1565C0]">Home</span> ›
        <span className="font-semibold text-gray-800">Messages</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex bg-white shadow-sm rounded-none md:rounded-xl md:m-3 border border-gray-200 w-full overflow-hidden">

          {/* Sidebar */}
          <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] flex-col border-r border-gray-200 shrink-0`}>
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={18} className="text-[#0D47A1]" />
                <span className="font-black text-[15px] text-[#0D47A1]">Messages</span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-gray-100 rounded-lg text-[12px] outline-none focus:bg-white focus:ring-1 focus:ring-[#0D47A1] transition-all"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  {searchQuery ? 'No users match your search' : 'No users to chat with yet'}
                </div>
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    className={`w-full flex items-center gap-3 p-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors text-left ${
                      selectedUser?.id === u.id ? 'bg-blue-50 border-l-[3px] border-l-[#0D47A1]' : 'border-l-[3px] border-l-transparent'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#0D47A1] to-[#1565C0] rounded-full flex items-center justify-center text-white font-black text-[14px]">
                        {(u.full_name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 bg-green-400 w-3 h-3 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-gray-900 truncate">{u.full_name}</div>
                      <div className={`text-[11px] font-semibold capitalize flex items-center gap-1 ${getRoleColor(u.role)}`}>
                        {getRoleBadge(u.role)} {u.role}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-gray-50`}>
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center gap-3 shadow-sm">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="md:hidden text-[#0D47A1] font-bold text-[13px] mr-1"
                  >
                    ← Back
                  </button>
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 bg-gradient-to-br from-[#0D47A1] to-[#1565C0] rounded-full flex items-center justify-center text-white font-black text-[13px]">
                      {(selectedUser.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <Circle size={10} className="absolute -bottom-0.5 -right-0.5 text-green-400 fill-green-400" />
                  </div>
                  <div>
                    <div className="font-bold text-[14px] text-gray-900">{selectedUser.full_name}</div>
                    <div className={`text-[11px] font-semibold capitalize ${getRoleColor(selectedUser.role)}`}>
                      {getRoleBadge(selectedUser.role)} {selectedUser.role}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-gray-400">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <MessageSquare size={28} className="text-gray-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-500">No messages yet</p>
                        <p className="text-sm">Say hi to {selectedUser.full_name}!</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((m, i) => {
                        const isMe = m.sender_id === user?.id;
                        const showTime = i === 0 || formatTime(messages[i - 1].created_at) !== formatTime(m.created_at);
                        return (
                          <div key={m.id}>
                            {showTime && i > 0 && (
                              <div className="text-center text-[10px] text-gray-400 my-2">
                                {formatTime(m.created_at)}
                              </div>
                            )}
                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[72%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                                  isMe
                                    ? 'bg-[#0D47A1] text-white rounded-tr-sm'
                                    : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
                                } ${m.id.startsWith('temp-') ? 'opacity-70' : ''}`}
                              >
                                {m.content}
                                <div className={`text-[10px] mt-0.5 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                  {formatTime(m.created_at)}
                                  {isMe && <span className="ml-1">{m.id.startsWith('temp-') ? '○' : '✓'}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder={`Message ${selectedUser.full_name}...`}
                    maxLength={500}
                    className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#0D47A1]/30 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="w-10 h-10 bg-[#0D47A1] hover:bg-[#1565C0] disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shrink-0 transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-6">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                  <MessageSquare size={36} className="text-[#0D47A1]" />
                </div>
                <div>
                  <h3 className="font-black text-[16px] text-gray-800 mb-1">Your Messages</h3>
                  <p className="text-[13px] text-gray-500 max-w-xs">
                    Select a conversation from the list to start chatting with buyers, sellers, or creators.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
