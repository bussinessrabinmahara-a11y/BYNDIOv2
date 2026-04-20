import { Link } from 'react-router-dom';
import { ShoppingBag, Smartphone, Mail, Phone, MapPin, Instagram, Youtube, Twitter } from 'lucide-react';
import { useAppStore } from '../store';
import { motion } from 'framer-motion';

export default function Footer() {
  const siteSettings = useAppStore(s => s.siteSettings);
  const footerAbout = siteSettings?.footer_about || "India's 0% commission social commerce ecosystem. Revenue from logistics, ads & subscriptions — never from seller margins.";
  const contactEmail = siteSettings?.contact_email || "support@byndio.in";
  const contactPhone = siteSettings?.contact_phone || "1800-BYNDIO (toll free)";
  const contactAddress = siteSettings?.contact_address || "Mumbai, Maharashtra, India";

  return (
    <footer className="mt-auto flex flex-col pt-4">
      {/* Merged Gradient CTA Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-r from-[#0D47A1] via-[#1565C0] to-[#0277BD] relative -mb-10 pb-20 pt-12 px-6 shadow-2xl rounded-t-[40px] z-10 text-white overflow-hidden"
      >
        {/* Abstract background shapes */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-64 h-64 bg-[#F57C00]/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4 md:gap-12 relative z-20 items-start md:items-center">
          
          {/* Column 1: Seller Info */}
          <div className="flex flex-col items-start pr-2 md:pr-8 md:border-r border-white/10 h-fit">
            <span className="inline-block bg-[#F57C00] text-white text-[7px] md:text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full mb-1.5 shadow-md uppercase">
              REGISTER
            </span>
            <h2 className="text-[14px] md:text-[24px] font-black leading-tight mb-2.5">
              Start <br className="md:hidden"/> Selling
            </h2>
            <Link to="/seller" className="bg-gradient-to-r from-[#F57C00] to-[#E65100] hover:from-[#E65100] hover:to-[#F57C00] text-white px-3 py-1.5 rounded-lg text-[10px] md:text-[14px] font-black transition-all shadow-lg text-center w-full border border-white/10 active:scale-95">Start Now</Link>
          </div>

          {/* Column 2: Benefits Checklist */}
          <div className="flex flex-col items-start md:border-r border-white/10 px-0 md:px-8 h-fit">
             <h3 className="font-black text-[10px] md:text-[16px] mb-2 md:mb-4 uppercase tracking-widest text-white/70">Benefits</h3>
             <div className="grid grid-cols-1 gap-1.5 md:gap-2 w-full">
              {['0% Comms','No Stock','Pan India','Fast Pay'].map(f => (
                <div key={f} className="flex items-center gap-1.5 text-white">
                  <div className="w-3.5 h-3.5 md:w-5 md:h-5 bg-white/15 rounded-full flex items-center justify-center shrink-0 border border-white/10">
                    <span className="text-[7px] md:text-[10px] font-black">✓</span>
                  </div>
                  <span className="text-[10px] md:text-[13px] font-black leading-none opacity-90">{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: App Download */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="col-span-2 md:col-span-1 flex flex-col items-start md:items-start text-left h-fit pt-4 md:pt-0 pl-0 md:pl-8 border-t md:border-t-0 border-white/10"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center bg-white/10 rounded-lg p-1.5 backdrop-blur-md border border-white/10 w-fit">
                <Smartphone size={14} className="text-white md:w-6 md:h-6" />
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
                <h3 className="font-black text-[12px] md:text-[20px] leading-tight">Get App</h3>
                <span className="bg-white/20 text-white/90 text-[7px] md:text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-white/10 w-fit">
                  Coming Soon
                </span>
              </div>
            </div>
            <div className="flex flex-row md:flex-col gap-2 w-full">
              <a href="#" className="flex-1 bg-black/90 hover:bg-black border border-white/10 rounded-xl px-2.5 py-1.5 text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/31/Apple_logo_white.svg" alt="Apple" className="w-3.5 h-3.5 md:w-5 md:h-5 object-contain" />
                <span className="text-[10px] md:text-[12px] font-black">App Store</span>
              </a>
              <a href="#" className="flex-1 bg-black/90 hover:bg-black border border-white/10 rounded-xl px-2.5 py-1.5 text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg">
                <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/Google_Play_Arrow_logo.svg" alt="Google Play" className="w-3.5 h-3.5 md:w-5 md:h-5 object-contain" />
                <span className="text-[10px] md:text-[12px] font-black">Play Store</span>
              </a>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Standard Complete Footer Links */}
      <div className="bg-[#0A2540] text-blue-100 pt-10 pb-16 md:pt-20 md:pb-8 px-4 md:px-6 relative z-0">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-8 md:gap-8 mb-6 md:mb-10 max-w-7xl mx-auto">
          {/* Brand */}
          <div className="col-span-4 lg:col-span-1 border-b border-white/10 pb-4 md:border-0 md:pb-0">
            <div className="text-[16px] md:text-2xl text-white font-black flex items-center gap-1.5 mb-2.5 md:mb-4">
              <span className="bg-[#F57C00] px-1 md:px-2 py-0.5 md:py-1 rounded-md shadow-lg"><ShoppingBag size={14} className="md:w-5 md:h-5" /></span> BYNDIO
            </div>
            <div className="text-[10px] md:text-[12px] opacity-70 leading-relaxed max-w-[240px] mb-4">{footerAbout}</div>
            {/* Social Links */}
            <div className="flex gap-2 items-center">
              {[
                { href: 'https://instagram.com/byndio.official', label: 'Instagram', icon: <Instagram size={14} /> },
                { href: 'https://youtube.com/@byndio', label: 'YouTube', icon: <Youtube size={14} /> },
                { href: 'https://twitter.com/byndio', label: 'Twitter', icon: <Twitter size={14} /> }
              ].map((s, i) => (
                <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="w-8 h-8 bg-white/5 hover:bg-[#1565C0] rounded-full flex items-center justify-center transition-colors">
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {[
            { title: 'For Sellers', links: [['Start Selling FREE','/seller'],['Seller Dashboard','/seller-dashboard'],['Affiliate Program','/affiliate'],['B2B Supply','/b2b']] },
            { title: 'For Buyers', links: [['Browse Products','/products'],['Browse Categories','/categories'],['Track My Orders','/my-orders'],['Returns & Refunds','/returns'],['Rewards & Wallet','/rewards'],['⚡ Flash Sales','/flash-sales']] },
            { title: 'Creators & Partners', links: [['Join Creator Hub','/influencer'],['Creator Dashboard','/creator-dashboard'],['Affiliate Engine','/affiliate'],['🏆 Leaderboard','/leaderboard'],['Compare Products','/compare']] }
          ].map(col => (
            <div key={col.title} className="flex flex-col">
              <h4 className="text-[9px] md:text-[13px] text-white font-black uppercase tracking-widest mb-2.5 md:mb-5 h-7 md:h-auto flex items-center">{col.title}</h4>
              <div className="flex flex-col gap-1.5 md:gap-3">
                {col.links.map(([label, href]) => (
                  <Link key={label} to={href} className="text-[10px] md:text-[13px] text-blue-200/80 hover:text-white transition-colors leading-tight">{label}</Link>
                ))}
              </div>
            </div>
          ))}

          {/* Contact */}
          <div className="flex flex-col">
            <h4 className="text-[9px] md:text-[13px] text-white font-black uppercase tracking-widest mb-2.5 md:mb-5 h-7 md:h-auto flex items-center">Contact</h4>
            <div className="flex flex-col gap-2 md:gap-3 text-[10px] md:text-[13px] text-blue-200/80">
              <span className="flex items-center gap-1.5"><Mail size={10} className="shrink-0" /><span className="truncate">Email</span></span>
              <span className="flex items-center gap-1.5"><Phone size={10} className="shrink-0" /><span className="truncate">Call</span></span>
              <span className="flex items-center gap-1.5"><MapPin size={10} className="shrink-0" /><span className="truncate">Mumbai</span></span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 max-w-7xl mx-auto">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] md:text-[12px] opacity-60 font-black">BYNDIO Technologies Pvt Ltd</p>
            <p className="text-[9px] md:text-[11px] opacity-40 leading-relaxed">
              CIN: U74999MH2024PTC123456 | GSTIN: 27AABCX1234X1Z1<br/>
              Registered Office: Floor 12, Tech Tower, BKC, Mumbai, MH - 400051
            </p>
            <p className="text-[9px] md:text-[11px] opacity-40 mt-1">
              © {new Date().getFullYear()} BYNDIO. Built with ❤️ in India.
            </p>
          </div>
          <div className="flex gap-4 md:gap-6 flex-wrap justify-center">
            {['About','Privacy','Terms','Refund','Grievance'].map((l, i) => (
              <Link key={i} to={`/legal/${l.toLowerCase()}`} className="text-[10px] md:text-[12px] opacity-60 hover:opacity-100 transition-opacity font-bold">
                {l} {l !== 'About' && l !== 'Grievance' ? 'Policy' : ''}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
