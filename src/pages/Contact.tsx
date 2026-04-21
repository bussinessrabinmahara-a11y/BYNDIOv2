import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Instagram, Youtube, Twitter, MessageSquare, Send, Globe, ShieldCheck } from 'lucide-react';
import { useAppStore } from '../store';
import { usePageTitle } from '../lib/usePageTitle';

export default function Contact() {
  usePageTitle('Contact Us');
  const siteSettings = useAppStore(s => s.siteSettings);

  const contactDetails = [
    {
      icon: <Mail className="text-[#0D47A1]" size={24} />,
      label: 'Email Support',
      value: siteSettings?.contact_email || 'support@byndio.in',
      href: `mailto:${siteSettings?.contact_email || 'support@byndio.in'}`,
      desc: 'Our support team usually responds within 24 hours.'
    },
    {
      icon: <Phone className="text-[#0D47A1]" size={24} />,
      label: 'Phone / Toll Free',
      value: siteSettings?.contact_phone || '1800-BYNDIO',
      href: `tel:${(siteSettings?.contact_phone || '').replace(/\D/g, '')}`,
      desc: 'Available Mon-Sat, 9:00 AM to 6:00 PM.'
    },
    {
      icon: <MessageSquare className="text-[#25D366]" size={24} />,
      label: 'WhatsApp Support',
      value: siteSettings?.whatsapp_number || siteSettings?.contact_phone || 'Chat with us',
      href: `https://wa.me/${(siteSettings?.whatsapp_number || siteSettings?.contact_phone || '').replace(/\D/g, '').length === 10 ? '91' : ''}${(siteSettings?.whatsapp_number || siteSettings?.contact_phone || '').replace(/\D/g, '')}`,
      desc: 'Instant support for quick queries and order tracking.'
    },
    {
      icon: <MapPin className="text-[#F57C00]" size={24} />,
      label: 'Headquarters',
      value: siteSettings?.contact_address || 'Mumbai, Maharashtra, India',
      href: '#',
      desc: 'BYNDIO Technologies Pvt Ltd, Tech Tower, BKC.'
    }
  ];

  const socialLinks = [
    { icon: <Instagram size={20} />, label: 'Instagram', href: siteSettings?.instagram_url || 'https://instagram.com/byndio.official', color: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]' },
    { icon: <Twitter size={20} />, label: 'Twitter', href: siteSettings?.twitter_url || 'https://twitter.com/byndio', color: 'bg-black' },
    { icon: <Youtube size={20} />, label: 'YouTube', href: siteSettings?.youtube_url || 'https://youtube.com/@byndio', color: 'bg-[#FF0000]' },
    { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>, label: 'Facebook', href: siteSettings?.facebook_url || 'https://facebook.com/byndio', color: 'bg-[#1877F2]' }
  ];

  return (
    <div className="min-h-screen bg-[#F4F6F8] pb-20">
      {/* Hero Section */}
      <div className="bg-[#0D47A1] text-white pt-16 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#F57C00]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black mb-6 tracking-tight"
          >
            How can we <span className="text-[#FFCA28]">help</span> you?
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto font-medium opacity-90"
          >
            Whether you're a buyer, seller, or creator, our team is here to ensure your BYNDIO experience is beyond ordinary.
          </motion.p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contactDetails.map((item, i) => (
                <motion.a
                  key={i}
                  href={item.href}
                  target={item.href.startsWith('http') ? '_blank' : undefined}
                  rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <h3 className="font-black text-gray-900 mb-1">{item.label}</h3>
                  <p className="text-[#0D47A1] font-bold text-sm mb-2 break-all">{item.value}</p>
                  <p className="text-gray-500 text-[12px] leading-relaxed">{item.desc}</p>
                </motion.a>
              ))}
            </div>

            {/* Quick Contact Form Mockup */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100"
            >
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <Send className="text-[#0D47A1]" /> Send us a message
              </h2>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={e => e.preventDefault()}>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input type="text" placeholder="John Doe" className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:border-[#0D47A1] outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input type="email" placeholder="john@example.com" className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:border-[#0D47A1] outline-none transition-all" />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Message</label>
                  <textarea rows={4} placeholder="How can we help you today?" className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:bg-white focus:border-[#0D47A1] outline-none transition-all resize-none" />
                </div>
                <button className="md:col-span-2 bg-[#0D47A1] text-white font-black py-4 rounded-xl shadow-lg hover:bg-[#1565C0] transition-all active:scale-95">
                  Submit Inquiry
                </button>
              </form>
            </motion.div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            {/* Social Links */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-900 mb-6 flex items-center gap-2">
                <Globe className="text-[#0D47A1]" size={20} /> Follow our journey
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {socialLinks.map((social, i) => (
                  <a 
                    key={i} 
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md transition-all group"
                  >
                    <div className={`w-10 h-10 ${social.color} text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      {social.icon}
                    </div>
                    <span className="text-[11px] font-black text-gray-600 uppercase tracking-tighter">{social.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Trust Banner */}
            <div className="bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
              <ShieldCheck className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
              <h3 className="text-xl font-black mb-3 relative z-10">Safe & Secure</h3>
              <p className="text-sm opacity-80 leading-relaxed mb-6 relative z-10">
                Your data security is our top priority. All communications are encrypted and managed according to our strict privacy policy.
              </p>
              <div className="flex items-center gap-2 relative z-10">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest">ISO 27001 Certified</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h3 className="font-black text-gray-900 mb-4 text-sm uppercase tracking-widest">Self Service</h3>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Track My Order', href: '/my-orders' },
                  { label: 'Return Policy', href: '/legal/refund' },
                  { label: 'Seller Support', href: '/seller' },
                  { label: 'Privacy Policy', href: '/legal/privacy' }
                ].map((link, i) => (
                  <a key={i} href={link.href} className="text-[13px] font-bold text-gray-500 hover:text-[#0D47A1] transition-colors flex items-center justify-between p-2 rounded-lg hover:bg-blue-50">
                    {link.label} <span>→</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
