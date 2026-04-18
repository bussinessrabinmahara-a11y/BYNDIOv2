import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/usePageTitle';
import { Shield, Users, TrendingUp, Award } from 'lucide-react';

export default function About() {
  usePageTitle('About BYNDIO');
  return (
    <div className="bg-[#F5F5F5] min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#0D47A1] to-[#1565C0] text-white py-16 px-6 text-center">
        <h1 className="text-4xl font-black mb-3">About BYNDIO</h1>
        <p className="text-[16px] opacity-85 max-w-xl mx-auto">
          India's fairest marketplace. 0% commission for sellers. 20,000+ creator partners. Revenue from logistics, ads and subscriptions — never from seller margins.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Mission */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
          <h2 className="text-2xl font-black text-[#0D47A1] mb-4">🎯 Our Mission</h2>
          <p className="text-[15px] text-gray-700 leading-relaxed mb-4">
            BYNDIO was built to fix what's broken in Indian e-commerce. Traditional platforms charge sellers 15–30% commission, leaving small businesses with razor-thin margins. We believe sellers should keep their profits.
          </p>
          <p className="text-[15px] text-gray-700 leading-relaxed">
            We make money through logistics margins, platform subscriptions, promoted listings, and B2B lead generation — never by taking a cut from seller sales.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: '🏪', value: '50,000+', label: 'Sellers' },
            { icon: '🛍️', value: '10 Lakh+', label: 'Products' },
            { icon: '⭐', value: '20,000+', label: 'Creators' },
            { icon: '💰', value: '0%', label: 'Commission' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-5 text-center shadow-sm">
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-xl font-black text-[#0D47A1]">{s.value}</div>
              <div className="text-[12px] text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Legal / Compliance */}
        <div className="bg-white rounded-2xl p-8 shadow-sm mb-6">
          <h2 className="text-xl font-black text-[#0D47A1] mb-4">⚖️ Legal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] text-gray-700">
            <div><strong>Company Name:</strong> BYNDIO Technologies Pvt Ltd</div>
            <div><strong>Registered Office:</strong> Mumbai, Maharashtra, India</div>
            <div><strong>CIN:</strong> U74999MH2024PTC000000 (Pending)</div>
            <div><strong>GSTIN:</strong> Pending Registration</div>
            <div><strong>Email:</strong> support@byndio.in</div>
            <div><strong>Helpline:</strong> 1800-BYNDIO (Toll Free)</div>
          </div>
        </div>

        {/* Grievance Officer — REQUIRED by Consumer Protection (E-Commerce) Rules 2020 */}
        <div className="bg-[#FFF8E1] border border-[#FFE082] rounded-2xl p-8 shadow-sm mb-6">
          <h2 className="text-xl font-black text-[#E65100] mb-2">🧑‍⚖️ Grievance Officer</h2>
          <p className="text-[12px] text-gray-600 mb-4">
            As required under the Consumer Protection (E-Commerce) Rules 2020 and IT Act 2000, BYNDIO has designated a Grievance Officer for consumer complaints.
          </p>
          <div className="flex flex-col gap-2 text-[13px] text-gray-700">
            <div><strong>Name:</strong> Grievance Officer, BYNDIO Technologies</div>
            <div><strong>Email:</strong> grievance@byndio.in</div>
            <div><strong>Address:</strong> BYNDIO Technologies Pvt Ltd, Mumbai, Maharashtra - 400001</div>
            <div><strong>Response Time:</strong> All complaints acknowledged within 48 hours and resolved within 1 month</div>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Link to="/legal/privacy" className="bg-[#0D47A1] text-white px-5 py-2.5 rounded-md font-bold text-[13px] hover:bg-[#1565C0] transition-colors">Privacy Policy</Link>
          <Link to="/legal/terms" className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-md font-bold text-[13px] hover:bg-gray-50 transition-colors">Terms of Use</Link>
          <Link to="/legal/refund" className="bg-white border border-gray-300 text-gray-700 px-5 py-2.5 rounded-md font-bold text-[13px] hover:bg-gray-50 transition-colors">Refund Policy</Link>
        </div>
      </div>
    </div>
  );
}
