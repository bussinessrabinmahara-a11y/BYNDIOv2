import { useParams, Link } from 'react-router-dom';

const content: Record<string, { title: string; body: string }> = {
  privacy: {
    title: '🔒 Privacy Policy',
    body: `Last updated: April 2026

BYNDIO Technologies Pvt Ltd ("BYNDIO", "we", "us") respects your privacy. This policy explains how we collect, use, and protect your information.

**Company Information**
BYNDIO Technologies Pvt Ltd
CIN: U74999MH2024PTC123456 (Sample)
PAN: AABCXXXXXXXX (Sample)
Registered Office: Floor 12, Tech Tower, BKC, Mumbai, Maharashtra 400051, India

**Information We Collect**
We collect information you provide directly, such as when you create an account, place an order, or contact us. This includes name, email, phone number, shipping address, and payment information. We also collect usage data automatically, such as pages visited, search queries, and device information.

**How We Use Your Information**
We use your information to process orders, provide customer support, personalise your experience, send transactional emails, and improve our platform. We do not sell your personal data to third parties.

**Data Storage & Security**
Your data is stored securely on Supabase infrastructure with row-level security. Payments are processed by Razorpay and we never store card details.

**Your Rights**
You may request access to, correction of, or deletion of your personal data at any time by contacting support@byndio.in.

**Contact**
Email: support@byndio.in | Address: BKC, Mumbai, Maharashtra, India`,
  },
  terms: {
    title: '📋 Terms of Use',
    body: `Last updated: April 2026

By using BYNDIO you agree to these terms.

**Eligibility**
You must be 18 years or older to create an account and make purchases on BYNDIO.

**Seller Obligations**
Sellers must list only genuine products, honour orders placed through the platform, and comply with all applicable Indian laws including GST registration where required.

**Buyer Obligations**
Buyers agree not to abuse return policies, file fraudulent chargebacks, or engage in any activity that harms sellers or the platform.

**Prohibited Activities**
Fake reviews, self-referral abuse, account farming, and any fraudulent activity will result in immediate account suspension.

**Limitation of Liability**
BYNDIO acts as a marketplace facilitator. We are not liable for product quality disputes beyond our return policy.

**Contact**
Email: legal@byndio.in`,
  },
  refund: {
    title: '↩️ Refund Policy',
    body: `Last updated: April 2026

**Return Window**
Most products can be returned within 7 days of delivery. Electronics and perishables may have shorter windows as specified on the product page.

**Condition**
Items must be unused, in original packaging, and accompanied by the original invoice.

**Refund Timeline**
Refunds are processed within 5–7 business days after we receive the returned item. Amount is credited to your original payment method or BYNDIO wallet.

**Non-Returnable Items**
Perishable goods, personalised/custom items, and digital products are non-returnable unless defective.

**How to Initiate a Return**
Login → My Orders → Select Order → Request Return. Our team will arrange a free pickup.

**Contact**
Email: returns@byndio.in | Helpline: 1800-BYNDIO`,
  },
  shipping: {
    title: '🚚 Shipping Policy',
    body: `Last updated: April 2026

**Delivery Timeline**
Standard delivery: 5-7 business days across India
Express delivery: 2-3 business days (available in select cities)
Remote areas: 7-14 business days

**Shipping Charges**
Free shipping on orders above ₹499
Flat ₹49 shipping for orders below ₹499
Express shipping: ₹99 (where available)

**Order Processing**
Orders placed before 12 PM IST ship same business day
Order tracking available in My Orders section
SMS updates on shipment status

**Order Tracking**
Track your order via My Orders page
Enter tracking number on Shiprocket portal
WhatsApp updates available

**Damaged/Lost Packages**
Report within 48 hours of delivery
We will investigate and replace/refund
Do not accept damaged packages from courier

**International Shipping**
Currently available to select countries
Contact support@byndio.in for international orders

**Contact**
Email: shipping@byndio.in | Helpline: 1800-BYNDIO`,
  },
  kyc: {
    title: '🔐 KYC Policy',
    body: `Last updated: April 2026

**Why KYC is Required**
As per RBI guidelines and DPDP Act 2023, we need to verify seller identity before enabling payouts. This helps prevent fraud and ensures secure transactions.

**Documents Required for Sellers**
- PAN Card (mandatory) - for identity verification
- Bank Account Proof - cancelled cheque/passbook
- Business Address Proof - electricity bill/rent agreement
- GST Certificate (if registered)

**Documents Required for Influencers**
- PAN Card (mandatory)
- Aadhaar Card (for payment)
- Bank account details for commission

**KYC Process**
1. Submit documents via KYC page
2. Our team verifies within 24-48 hours
3. Get notified via email on approval
4. Start selling/accepting payments

**Data Security**
All KYC documents are encrypted at rest
Only authorized personnel can access
Documents are deleted after verification (within 90 days)
We comply with DPDP Act 2023

**Common Rejection Reasons**
- Blurry/illegible documents
- Expired documents
- Mismatch between name on PAN and bank account
- Incomplete application

**Contact**
Email: kyc@byndio.in`,
  },
  cookie: {
    title: '🍪 Cookie Policy',
    body: `Last updated: April 2026

**What Are Cookies**
Cookies are small text files stored on your device when you visit websites. They help remember your preferences and improve your experience.

**Types of Cookies We Use**

**Essential Cookies** (Required for basic functionality)
- Authentication and login state
- Shopping cart items
- Security features
- Preferences (language, currency)

**Analytics Cookies** (Optional - you can disable)
- Google Analytics (anonymized)
- Page views and navigation patterns
- Device and browser information

**Marketing Cookies** (Optional - requires consent)
- Retargeting advertisements
- Personalised recommendations
- Measuring ad effectiveness

**Your Choices**
- Manage cookie preferences via Cookie Consent banner
- Disable non-essential cookies in browser settings
- Clear cookies anytime via browser

**Third-Party Cookies**
We use trusted third-parties:
- Razorpay (payment processing)
- Google Analytics (analytics)
- Shiprocket (shipping)
- Supabase (database)

**Updates to This Policy**
We may update this policy periodically.
Last updated: April 2026

**Contact**
Email: privacy@byndio.in`,
  },
  grievance: {
    title: '⚖️ Grievance Redressal',
    body: `Last updated: April 2026

In accordance with Information Technology Act 2000 and consumer protection rules, the contact details of the Grievance Officer are provided below:

**Grievance Officer**
Name: Mr. Rajesh Kumar
Designation: Nodal Officer - Grievance Redressal
Email: grievance@byndio.in
Phone: +91-22-XXXX-XXXX
Address: BYNDIO Technologies Pvt Ltd, Floor 12, Tech Tower, BKC, Mumbai 400051

**Response Timeline**
- Acknowledgement: Within 48 hours
- Resolution: Within 15 business days from receipt of complaint

**How to file a complaint**
Please send an email to grievance@byndio.in with your Order ID, Registered Email, and detailed description of the issue.

**Escalation**
If you are not satisfied with the resolution, you may escalate to legal@byndio.in`,
  },
};

export default function Legal() {
  const { page } = useParams<{ page: string }>();
  const info = content[page || ''];

  if (!info) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-xl font-black mb-2">Page not found</h2>
        <Link to="/" className="text-[#1565C0] underline">Go Home</Link>
      </div>
    </div>
  );

  return (
    <div className="bg-[#F5F5F5] min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <Link to="/" className="text-[#1565C0] hover:underline">Home</Link> ›
          <span>{info.title}</span>
        </div>
        <h1 className="text-2xl font-black text-[#0D47A1] mb-6">{info.title}</h1>
        <div className="prose prose-sm max-w-none">
          {info.body.split('\n\n').map((para, i) => {
            const parts = para.split(/\*\*(.*?)\*\*/);
            return (
              <p key={i} className="text-[14px] text-gray-700 leading-relaxed mb-4 whitespace-pre-line">
                {parts.map((part, j) =>
                  j % 2 === 1
                    ? <strong key={j} className="text-gray-900 font-bold">{part}</strong>
                    : part
                )}
              </p>
            );
          })}
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4 flex-wrap">
          {page !== 'privacy' && <Link to="/legal/privacy" className="text-[#1565C0] text-sm hover:underline">Privacy Policy</Link>}
          {page !== 'terms' && <Link to="/legal/terms" className="text-[#1565C0] text-sm hover:underline">Terms of Use</Link>}
          {page !== 'refund' && <Link to="/legal/refund" className="text-[#1565C0] text-sm hover:underline">Refund Policy</Link>}
          {page !== 'shipping' && <Link to="/legal/shipping" className="text-[#1565C0] text-sm hover:underline">Shipping Policy</Link>}
          {page !== 'kyc' && <Link to="/legal/kyc" className="text-[#1565C0] text-sm hover:underline">KYC Policy</Link>}
          {page !== 'cookie' && <Link to="/legal/cookie" className="text-[#1565C0] text-sm hover:underline">Cookie Policy</Link>}
          {page !== 'grievance' && <Link to="/legal/grievance" className="text-[#1565C0] text-sm hover:underline">Grievance</Link>}
        </div>
      </div>
    </div>
  );
}
